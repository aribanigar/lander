/**
 * POST /api/gmail/scan
 * Scans the user's Gmail inbox for replies to job applications.
 * - Fetches emails received since last scan
 * - Matches each to an Application by sender domain / subject
 * - Classifies with Claude (real interest / rejection / automated / neutral)
 * - Updates Application status + creates Reply record + sends notification
 *
 * Called by: Vercel Cron every 15 min + manually from Settings UI
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import Application from "@/lib/db/models/application";
import Reply from "@/lib/db/models/reply";
import Interview from "@/lib/db/models/interview";
import { getGmailClient, extractPlainText, getHeader } from "@/lib/gmail/client";
import { classifyEmailReply } from "@/lib/ai/claude";
import {
  sendPositiveReplyNotification,
  sendInterviewNotification,
  sendRejectionNotification,
} from "@/lib/email/resend";

export const maxDuration = 60;

/* ── Cron entry point (no Clerk session, uses x-cron-secret header) ──────── */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Find all users with Gmail connected
  const users = await User.find({ gmailConnected: true })
    .select("+gmailRefreshToken")
    .lean();

  let totalProcessed = 0;
  for (const user of users) {
    if (!user.gmailRefreshToken) continue;
    const count = await scanUserInbox(user.clerkId, user.gmailRefreshToken as string, user);
    totalProcessed += count;
  }

  return NextResponse.json({ scanned: users.length, emailsProcessed: totalProcessed });
}

/* ── Manual trigger from Settings UI ─────────────────────────────────────── */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findOne({ clerkId: userId })
    .select("+gmailRefreshToken")
    .lean();

  if (!user?.gmailConnected || !user.gmailRefreshToken) {
    return NextResponse.json({ error: "Gmail not connected. Go to Settings → Integrations." }, { status: 400 });
  }

  const processed = await scanUserInbox(userId, user.gmailRefreshToken as string, user);
  return NextResponse.json({ processed });
}

/* ── Core scan logic ─────────────────────────────────────────────────────── */
async function scanUserInbox(
  userId: string,
  refreshToken: string,
  user: Record<string, unknown>
): Promise<number> {
  const gmail = getGmailClient(refreshToken);

  // Fetch messages since last scan (or last 3 days on first run)
  const lastScan  = (user.gmailLastScannedAt as Date | undefined) ?? new Date(Date.now() - 3 * 86_400_000);
  const afterTs   = Math.floor(lastScan.getTime() / 1000);
  const query     = `in:inbox after:${afterTs} -from:me`;

  let messages: Array<{ id?: string | null; threadId?: string | null }> = [];
  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q:      query,
      maxResults: 50,
    });
    messages = listRes.data.messages ?? [];
  } catch {
    return 0;
  }

  if (messages.length === 0) {
    await User.updateOne({ clerkId: userId }, { gmailLastScannedAt: new Date() });
    return 0;
  }

  // Load all unapplied / applied applications for matching
  const applications = await Application.find({
    userId,
    status: { $in: ["applied", "viewed", "queued"] },
  })
    .sort({ appliedAt: -1 })
    .limit(500)
    .lean();

  let processed = 0;

  for (const msg of messages) {
    if (!msg.id) continue;

    // Skip if we already have a Reply for this Gmail message ID
    const alreadyProcessed = await Reply.exists({ gmailMessageId: msg.id });
    if (alreadyProcessed) continue;

    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id:     msg.id,
        format: "full",
      });

      const payload = full.data.payload;
      const headers = payload?.headers ?? [];

      const fromRaw   = getHeader(headers, "from");
      const subject   = getHeader(headers, "subject");
      const bodyText  = extractPlainText(payload);

      if (!fromRaw || !bodyText) continue;

      // Parse "Name <email@domain.com>" format
      const emailMatch = fromRaw.match(/<(.+?)>/) ?? [null, fromRaw.trim()];
      const fromEmail  = (emailMatch[1] ?? fromRaw).toLowerCase().trim();
      const fromName   = fromRaw.replace(/<.+>/, "").trim();
      const fromDomain = fromEmail.split("@")[1] ?? "";

      // Match to an application
      const matchedApp = applications.find((a) => {
        const companySlug = a.company.toLowerCase().replace(/[^a-z0-9]/g, "");
        const domainRoot  = fromDomain.split(".")[0];
        return (
          fromDomain.includes(companySlug.slice(0, 6)) ||
          companySlug.includes(domainRoot.slice(0, 6)) ||
          subject.toLowerCase().includes(a.company.toLowerCase()) ||
          subject.toLowerCase().includes(a.jobTitle.toLowerCase().split(" ").slice(0, 2).join(" "))
        );
      });

      if (!matchedApp) continue;

      // Classify with Claude
      const cls = await classifyEmailReply({
        subject,
        body:     bodyText.slice(0, 1500),
        company:  matchedApp.company,
        jobTitle: matchedApp.jobTitle,
      });

      // Save Reply record
      const reply = await Reply.create({
        userId,
        applicationId:            matchedApp._id,
        gmailMessageId:           msg.id,
        fromEmail,
        fromName,
        subject,
        bodyText:                 bodyText.slice(0, 5000),
        receivedAt:               new Date(parseInt(full.data.internalDate ?? "0")),
        classification:           cls.classification,
        classificationConfidence: cls.confidence,
        classificationReason:     cls.reason,
        isAutomatic:              cls.isAutomatic,
        sentiment:                cls.sentiment,
        urgency:                  cls.urgency,
        extractedInterviewDate:   cls.extractedInterviewDate,
        extractedInterviewLink:   cls.extractedInterviewLink,
        read:      false,
        archived:  false,
      });

      // Update application status
      const newStatus =
        cls.classification === "interview_invite" ? "interview" :
        cls.classification === "positive"         ? "positive"  :
        cls.classification === "rejection"        ? "rejected"  :
        cls.classification === "automated"        ? matchedApp.status :  // don't downgrade on automated
        "replied";

      if (newStatus !== matchedApp.status) {
        await Application.findByIdAndUpdate(matchedApp._id, {
          $set:  { status: newStatus, lastReplyAt: new Date(), lastReplySubject: subject, lastReplyClassification: cls.classification },
          $inc:  { replyCount: 1 },
          $push: { statusHistory: { status: newStatus, changedAt: new Date() } },
        });

        await User.updateOne(
          { clerkId: userId },
          { $inc: { totalReplied: 1, ...(newStatus === "rejected" ? { totalRejected: 1 } : {}) } }
        );
      }

      // Auto-create Interview record for interview invites
      if (cls.classification === "interview_invite" && cls.extractedInterviewDate) {
        const scheduledAt = new Date(cls.extractedInterviewDate);
        if (!isNaN(scheduledAt.getTime())) {
          await Interview.create({
            userId,
            applicationId: matchedApp._id,
            replyId:       reply._id,
            jobTitle:      matchedApp.jobTitle,
            company:       matchedApp.company,
            scheduledAt,
            type:          "video",
            meetingLink:   cls.extractedInterviewLink ?? undefined,
            status:        "upcoming",
          }).catch(() => {}); // ignore if duplicate

          await User.updateOne({ clerkId: userId }, { $inc: { totalInterviews: 1 } });
        }
      }

      // Send notifications (skip automated emails)
      if (!cls.isAutomatic) {
        const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const notifTo = (user.emailNotifications as string) || (user.email as string);

        if (
          notifTo &&
          (cls.classification === "positive" || cls.classification === "interview_invite") &&
          user.notifyOnPositiveReply
        ) {
          await sendPositiveReplyNotification({
            to: notifTo, userName: user.fullName as string,
            jobTitle: matchedApp.jobTitle, company: matchedApp.company,
            fromEmail, subject, dashboardUrl: appUrl,
          }).catch(() => null);

          if (cls.classification === "interview_invite" && cls.extractedInterviewDate) {
            const scheduledAt = new Date(cls.extractedInterviewDate);
            if (!isNaN(scheduledAt.getTime())) {
              await sendInterviewNotification({
                to: notifTo, userName: user.fullName as string,
                jobTitle: matchedApp.jobTitle, company: matchedApp.company,
                scheduledAt, meetingLink: cls.extractedInterviewLink ?? undefined,
                dashboardUrl: appUrl,
              }).catch(() => null);
            }
          }
        }

        if (cls.classification === "rejection" && user.notifyOnRejection) {
          await sendRejectionNotification({
            to: notifTo, userName: user.fullName as string,
            jobTitle: matchedApp.jobTitle, company: matchedApp.company,
            dashboardUrl: appUrl,
          }).catch(() => null);
        }
      }

      processed++;
    } catch (err) {
      console.error(`[gmail/scan] Error processing message ${msg.id}:`, err);
    }
  }

  // Update last scan timestamp
  await User.updateOne({ clerkId: userId }, { gmailLastScannedAt: new Date() });

  return processed;
}
