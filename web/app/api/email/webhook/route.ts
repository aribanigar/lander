import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import Reply from "@/lib/db/models/reply";
import Interview from "@/lib/db/models/interview";
import User from "@/lib/db/models/user";
import { classifyEmailReply } from "@/lib/ai/claude";
import {
  sendPositiveReplyNotification,
  sendInterviewNotification,
  sendRejectionNotification,
} from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("resend-signature") ?? req.headers.get("x-webhook-secret");
    if (sig !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await connectDB();

  // ── Resend delivery event: email opened → mark application as viewed ──
  if (payload.type === "email.opened") {
    const emailId = payload.data?.email_id as string | undefined;
    if (emailId) {
      const app = await Application.findOne({ status: "applied" });
      if (app) {
        app.status = "viewed";
        app.statusHistory.push({ status: "viewed", changedAt: new Date() });
        await app.save();
      }
    }
    return NextResponse.json({ received: true });
  }

  // ── Inbound reply email ──
  const fromEmail: string = payload.from ?? payload.sender ?? "";
  const fromName:  string = payload.fromName ?? fromEmail.split("<")[0].trim();
  const subject:   string = payload.subject ?? "";
  const bodyText:  string = payload.text ?? payload.plain ?? payload.body ?? "";
  const bodyHtml:  string | undefined = payload.html ?? undefined;

  if (!fromEmail || !bodyText) return NextResponse.json({ received: true });

  // Match to an application by sender domain vs company name
  const fromDomain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  const recentApps = await Application.find({ status: { $in: ["applied", "viewed"] } })
    .sort({ appliedAt: -1 })
    .limit(300)
    .lean();

  const matchedApp = recentApps.find((a) => {
    const slug = a.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      fromDomain.includes(slug.slice(0, 6)) ||
      slug.includes(fromDomain.split(".")[0].slice(0, 6)) ||
      subject.toLowerCase().includes(a.company.toLowerCase()) ||
      subject.toLowerCase().includes(a.jobTitle.toLowerCase().split(" ").slice(0, 2).join(" "))
    );
  });

  if (!matchedApp) return NextResponse.json({ received: true, matched: false });

  const userId = matchedApp.userId;
  const user   = await User.findOne({ clerkId: userId }).lean();
  if (!user) return NextResponse.json({ received: true });

  // ── Classify with Claude ──
  const cls = await classifyEmailReply({
    subject,
    body:     bodyText,
    company:  matchedApp.company,
    jobTitle: matchedApp.jobTitle,
  });

  // Save reply record — use cls.classification (not cls.type)
  const reply = await Reply.create({
    userId,
    applicationId:            matchedApp._id,
    fromEmail,
    fromName,
    subject,
    bodyText,
    bodyHtml,
    receivedAt:               new Date(),
    classification:           cls.classification,
    classificationConfidence: cls.confidence,
    classificationReason:     cls.reason,
    isAutomatic:              cls.isAutomatic,
    sentiment:                cls.sentiment,
    urgency:                  cls.urgency,
    extractedInterviewDate:   cls.extractedInterviewDate,
    extractedInterviewLink:   cls.extractedInterviewLink,
    read:                     false,
    archived:                 false,
  });

  // Map classification to application status
  const newStatus =
    cls.classification === "interview_invite" ? "interview" :
    cls.classification === "positive"         ? "positive"  :
    cls.classification === "rejection"        ? "rejected"  : "replied";

  await Application.findByIdAndUpdate(matchedApp._id, {
    $set:  { status: newStatus, lastReplyAt: new Date(), lastReplySubject: subject, lastReplyClassification: cls.classification },
    $inc:  { replyCount: 1 },
    $push: { statusHistory: { status: newStatus, changedAt: new Date() } },
  });

  await User.updateOne(
    { clerkId: userId },
    { $inc: { totalReplied: 1, ...(newStatus === "rejected" ? { totalRejected: 1 } : {}) } }
  );

  // Auto-create Interview record if invite detected
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
      });
      await User.updateOne({ clerkId: userId }, { $inc: { totalInterviews: 1 } });
    }
  }

  // ── Notify user ──
  const to = user.emailNotifications || user.email;
  if (!to) return NextResponse.json({ received: true });

  if (
    (cls.classification === "positive" || cls.classification === "interview_invite") &&
    user.notifyOnPositiveReply
  ) {
    await sendPositiveReplyNotification({
      to, userName: user.fullName, jobTitle: matchedApp.jobTitle,
      company: matchedApp.company, fromEmail, subject, dashboardUrl: appUrl,
    }).catch(() => null);

    if (cls.classification === "interview_invite" && cls.extractedInterviewDate) {
      const scheduledAt = new Date(cls.extractedInterviewDate);
      if (!isNaN(scheduledAt.getTime())) {
        await sendInterviewNotification({
          to, userName: user.fullName, jobTitle: matchedApp.jobTitle,
          company: matchedApp.company, scheduledAt,
          meetingLink: cls.extractedInterviewLink ?? undefined,
          dashboardUrl: appUrl,
        }).catch(() => null);
      }
    }
  }

  if (cls.classification === "rejection" && user.notifyOnRejection) {
    await sendRejectionNotification({
      to, userName: user.fullName, jobTitle: matchedApp.jobTitle,
      company: matchedApp.company, dashboardUrl: appUrl,
    }).catch(() => null);
  }

  return NextResponse.json({ received: true, classified: cls.classification, replyId: reply._id });
}
