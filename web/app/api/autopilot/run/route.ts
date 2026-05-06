/**
 * GET  /api/autopilot/run — Vercel Cron (daily at 06:00 UTC)
 * POST /api/autopilot/run — Manual trigger for the authenticated user only
 *
 * Auto-pilot loop per user:
 *   1. Discover fresh jobs from all 7 sources based on user profile
 *   2. Score + save new jobs
 *   3. Tailor resume + cover letter per job via Claude
 *   4. Apply: Greenhouse → direct REST API / Others → browser queue
 *   5. Schedule follow-up email sequence
 *   6. Send summary notification email
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import Job from "@/lib/db/models/job";
import Application from "@/lib/db/models/application";
import Resume from "@/lib/db/models/resume";
import { aggregateJobs } from "@/lib/jobs/aggregator";
import { extractJobKeywords, tailorResume } from "@/lib/ai/claude";
import { applyViaGreenhouse } from "@/lib/apply/greenhouse";
import { scheduleFollowUps } from "@/lib/db/scheduleFollowUps";
import { sendAppliedNotification } from "@/lib/email/resend";

export const dynamic    = "force-dynamic";
export const maxDuration = 300;

/* ── Shared autopilot logic for one user ─────────────────────────────────── */
async function runForUser(userId: string): Promise<{
  discovered: number;
  applied: number;
  queued: number;
  direct: number;
  skipped: number;
  failed: number;
}> {
  const user = await User.findOne({ clerkId: userId });
  if (!user) return { discovered: 0, applied: 0, queued: 0, direct: 0, skipped: 0, failed: 0 };

  // ── 1. Daily limit check ─────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await Application.countDocuments({
    userId,
    createdAt: { $gte: todayStart },
    status:    { $ne: "failed" },
  });
  const limit     = user.dailyApplyLimit ?? 20;
  const remaining = limit - todayCount;
  if (remaining <= 0) {
    console.log(`[autopilot] ${user.email} — daily limit reached (${limit})`);
    return { discovered: 0, applied: 0, queued: 0, direct: 0, skipped: remaining, failed: 0 };
  }

  // ── 2. Discover fresh jobs ───────────────────────────────────────────────
  const query   = `${user.role ?? ""} ${user.field ?? ""}`.trim() || "software engineer";
  const regions = (user.targetRegions?.length ? user.targetRegions : ["Global"]) as string[];
  const remote  = user.remotePreference === "Fully remote";

  const freshJobs = await aggregateJobs({ query, remote, regions, limit: 40 });

  // Save new jobs (skip duplicates)
  let discovered = 0;
  for (const j of freshJobs) {
    const exists = await Job.exists({ userId, externalId: j.externalId, source: j.source });
    if (exists) continue;

    let extracted = { required: [] as string[], niceToHave: [] as string[], atsKeywords: [] as string[], senioritySignals: [] as string[] };
    if (j.description && j.description.length > 100) {
      try { extracted = await extractJobKeywords(j.description); } catch { /* non-fatal */ }
    }

    const nicheWords = (user.niche ?? "").toLowerCase().split(" ");
    const descLower  = j.description.toLowerCase();
    const matchedKw  = nicheWords.filter((w: string) => w.length > 3 && descLower.includes(w));
    const atsScore   = Math.min(100, Math.round((matchedKw.length / Math.max(nicheWords.length, 1)) * 100));

    await Job.create({
      userId,
      externalId:        j.externalId,
      source:            j.source,
      url:               j.url,
      applyUrl:          j.applyUrl ?? j.url,
      atsType:           j.atsType ?? null,
      atsCompanySlug:    j.atsCompanySlug,
      atsJobId:          j.atsJobId,
      title:             j.title,
      company:           j.company,
      companyLogo:       j.companyLogo,
      location:          j.location,
      country:           j.country,
      latitude:          j.latitude,
      longitude:         j.longitude,
      remote:            j.remote,
      description:       j.description,
      extractedKeywords: extracted.atsKeywords,
      requiredSkills:    extracted.required,
      niceToHaveSkills:  extracted.niceToHave,
      atsScore,
      jobType:           j.jobType ?? "Full-time",
      salary:            j.salary ? { min: j.salary.min, max: j.salary.max, currency: j.salary.currency, period: "yearly" } : undefined,
      tags:              j.tags ?? [],
      postedAt:          j.postedAt ? new Date(j.postedAt) : undefined,
      discoveredAt:      new Date(),
    }).catch(() => {});
    discovered++;
  }

  // ── 3. Pick top-scoring unapplied jobs ───────────────────────────────────
  const alreadyApplied = await Application.distinct("jobId", { userId });
  const toApply = await Job.find({
    userId,
    _id:      { $nin: alreadyApplied },
    atsScore: { $gte: 20 },
  })
    .sort({ atsScore: -1 })
    .limit(remaining)
    .lean();

  // ── 4. Apply loop ────────────────────────────────────────────────────────
  const masterResume = await Resume.findOne({ userId, isMaster: true }).lean();
  const masterText   = (masterResume as { fullText?: string } | null)?.fullText ?? "";

  const counts = { applied: 0, queued: 0, direct: 0, failed: 0 };

  for (const job of toApply) {
    try {
      // Tailor resume + cover letter
      let tailored = {
        tailoredResume:   masterText,
        atsScore:         job.atsScore ?? 50,
        keywordsInjected: [] as string[],
        coverLetter:      "",
      };
      if (masterText) {
        tailored = await tailorResume({
          userProfile: { fullName: user.fullName, field: user.field, role: user.role, yearsExp: user.yearsExp, niche: user.niche },
          masterResumeText: masterText,
          jobTitle:         job.title,
          company:          job.company,
          jobDescription:   job.description ?? "",
          atsKeywords:      job.extractedKeywords ?? [],
        });
      }

      const savedResume = await Resume.create({
        userId, jobTitle: job.title, company: job.company,
        fullText: tailored.tailoredResume, sections: [],
        keywordsInjected: tailored.keywordsInjected, atsScore: tailored.atsScore,
        isMaster: false, version: 1,
      });

      // Route by ATS type
      let applyMethod = "browser_queued";
      let externalApplicationId: string | undefined;

      if (job.atsType === "greenhouse" && job.atsCompanySlug && job.atsJobId) {
        const nameParts = (user.fullName ?? "").split(" ");
        const ghResult  = await applyViaGreenhouse({
          boardToken: job.atsCompanySlug,
          jobId:      job.atsJobId,
          candidate: {
            firstName:   nameParts[0] ?? "Candidate",
            lastName:    nameParts.slice(1).join(" ") || ".",
            email:       user.emailNotifications ?? user.email ?? "",
            resumeText:  tailored.tailoredResume,
            coverLetter: tailored.coverLetter,
          },
        });
        if (ghResult.success) {
          applyMethod = "greenhouse_api";
          externalApplicationId = ghResult.applicationId;
          counts.direct++;
          await Job.updateOne({ _id: job._id }, { atsApplyResult: "success" });
        } else {
          applyMethod = "browser_queued";
          await Job.updateOne({ _id: job._id }, { atsApplyResult: "failed" });
        }
      } else {
        counts.queued++;
      }

      const application = await Application.create({
        userId,
        jobId:                job._id,
        jobTitle:             job.title,
        company:              job.company,
        companyLogo:          job.companyLogo,
        location:             job.location,
        country:              job.country,
        latitude:             job.latitude,
        longitude:            job.longitude,
        jobUrl:               job.url,
        applyUrl:             job.applyUrl ?? job.url,
        salary:               job.salary,
        remote:               job.remote,
        atsType:              job.atsType,
        applyMethod,
        externalApplicationId,
        status:               applyMethod === "greenhouse_api" ? "applied" : "queued",
        statusHistory:        [{ status: applyMethod === "greenhouse_api" ? "applied" : "queued", changedAt: new Date() }],
        tailoredResumeUrl:    savedResume._id.toString(),
        tailoredResumeText:   tailored.tailoredResume,
        coverLetter:          tailored.coverLetter,
        atsScore:             tailored.atsScore,
        keywordsMatched:      tailored.keywordsInjected,
        source:               job.source,
        appliedAt:            new Date(),
      });

      await User.updateOne({ clerkId: userId }, { $inc: { totalApplied: 1 } });

      scheduleFollowUps(userId, {
        _id:       application._id.toString(),
        company:   job.company,
        jobTitle:  job.title,
        appliedAt: application.appliedAt ?? new Date(),
      }, { fullName: user.fullName, niche: user.niche, field: user.field }).catch(() => {});

      if (user.notifyOnApply && user.emailNotifications) {
        sendAppliedNotification({
          to:       user.emailNotifications,
          userName: user.fullName,
          jobTitle: job.title,
          company:  job.company,
          jobUrl:   job.url,
          atsScore: tailored.atsScore,
        }).catch(() => {});
      }

      counts.applied++;
    } catch (err) {
      console.error(`[autopilot] Failed for ${job.company}:`, err);
      counts.failed++;
    }
  }

  console.log(`[autopilot] ${user.email} — discovered:${discovered} applied:${counts.applied} queued:${counts.queued} direct:${counts.direct}`);
  return { discovered, ...counts, skipped: remaining - counts.applied };
}

/* ── GET — Vercel Cron (all users with autopilot on) ─────────────────────── */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const users = await User.find({ autopilotEnabled: true, onboardingComplete: true }).select("clerkId email").lean();

  const summary: Record<string, unknown>[] = [];
  for (const u of users) {
    const result = await runForUser(u.clerkId as string);
    summary.push({ userId: u.clerkId, email: u.email, ...result });
  }

  return NextResponse.json({ ran: summary.length, summary, ts: new Date() });
}

/* ── POST — Manual trigger for the authenticated user ────────────────────── */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const result = await runForUser(userId);
  return NextResponse.json(result);
}
