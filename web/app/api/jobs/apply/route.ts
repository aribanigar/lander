/**
 * POST /api/jobs/apply
 * Bulk apply engine — runs for the authenticated user.
 *
 * Apply routing (in priority order):
 *   1. Greenhouse ATS  — direct REST API (no browser needed)
 *   2. Other ATS detected — marks as "needs_browser" for future browser-agent queue
 *   3. No ATS detected  — marks as "needs_browser"
 *
 * After each successful apply:
 *   - Creates Application record
 *   - Schedules 3-email follow-up sequence
 *   - Sends email notification (if enabled)
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import Job from "@/lib/db/models/job";
import Application from "@/lib/db/models/application";
import Resume from "@/lib/db/models/resume";
import { tailorResume, extractJobKeywords } from "@/lib/ai/claude";
import { sendAppliedNotification } from "@/lib/email/resend";
import { scheduleFollowUps } from "@/lib/db/scheduleFollowUps";
import { applyViaGreenhouse } from "@/lib/apply/greenhouse";

export const maxDuration = 300;

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ clerkId: userId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Daily limit guard
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await Application.countDocuments({
    userId,
    createdAt: { $gte: today },
    status: { $ne: "failed" },
  });
  const remaining = (user.dailyApplyLimit ?? 20) - todayCount;
  if (remaining <= 0) {
    return NextResponse.json({ message: "Daily apply limit reached", applied: 0 });
  }

  // Master resume
  const masterResume = await Resume.findOne({ userId, isMaster: true }).lean();
  const masterText   = (masterResume as { fullText?: string } | null)?.fullText ?? "";

  // Fetch unjobbed queue, sorted by ATS match score
  const alreadyApplied = await Application.distinct("jobId", { userId });
  const jobs = await Job.find({
    userId,
    _id:    { $nin: alreadyApplied },
    atsScore: { $gte: 30 },
  })
    .sort({ atsScore: -1 })
    .limit(remaining)
    .lean();

  const results = { applied: 0, atsDirected: 0, queued: 0, failed: 0 };

  for (const job of jobs) {
    try {
      // ── Step 1: Extract keywords ────────────────────────────────────────
      let atsKeywords: string[] = (job.extractedKeywords ?? []);
      if (atsKeywords.length === 0 && job.description) {
        const kw = await extractJobKeywords(job.description);
        atsKeywords = kw.atsKeywords;
      }

      // ── Step 2: Tailor resume + cover letter via Claude ─────────────────
      let tailored = {
        tailoredResume:   masterText,
        atsScore:         job.atsScore ?? 50,
        keywordsInjected: [] as string[],
        coverLetter:      "",
      };
      if (masterText) {
        tailored = await tailorResume({
          userProfile: {
            fullName: user.fullName,
            field:    user.field,
            role:     user.role,
            yearsExp: user.yearsExp,
            niche:    user.niche,
          },
          masterResumeText: masterText,
          jobTitle:         job.title,
          company:          job.company,
          jobDescription:   job.description ?? "",
          atsKeywords,
        });
      }

      // Save tailored resume version
      const savedResume = await Resume.create({
        userId,
        jobTitle:         job.title,
        company:          job.company,
        fullText:         tailored.tailoredResume,
        sections:         [],
        keywordsInjected: tailored.keywordsInjected,
        atsScore:         tailored.atsScore,
        isMaster:         false,
        version:          1,
      });

      // ── Step 3: Route by ATS type ────────────────────────────────────────
      let applyMethod: string = "pending";
      let externalApplicationId: string | undefined;

      if (job.atsType === "greenhouse" && job.atsCompanySlug && job.atsJobId) {
        // Direct Greenhouse REST API — no browser needed
        const nameParts = (user.fullName ?? "Candidate").split(" ");
        const ghResult  = await applyViaGreenhouse({
          boardToken: job.atsCompanySlug,
          jobId:      job.atsJobId,
          candidate: {
            firstName:   nameParts[0] ?? "Candidate",
            lastName:    nameParts.slice(1).join(" ") || ".",
            email:       user.emailNotifications ?? "",
            resumeText:  tailored.tailoredResume,
            coverLetter: tailored.coverLetter,
          },
        });

        if (ghResult.success) {
          applyMethod              = "greenhouse_api";
          externalApplicationId   = ghResult.applicationId;
          results.atsDirected++;
          // Record ATS result on job for transparency
          await Job.updateOne({ _id: job._id }, { atsApplyResult: "success" });
        } else {
          applyMethod = "greenhouse_failed";
          await Job.updateOne({ _id: job._id }, { atsApplyResult: "failed" });
          console.error(`Greenhouse apply failed for ${job.company}:`, ghResult.error);
        }
      } else if (job.atsType && job.atsType !== null) {
        // Other ATS (Lever, Workable, Ashby…) — queued for browser agent
        applyMethod = "browser_queued";
        results.queued++;
      } else {
        // No ATS detected — queued for browser agent
        applyMethod = "browser_queued";
        results.queued++;
      }

      // ── Step 4: Create Application record ───────────────────────────────
      const application = await Application.create({
        userId,
        jobId:               job._id,
        jobTitle:            job.title,
        company:             job.company,
        companyLogo:         job.companyLogo,
        location:            job.location,
        country:             job.country,
        latitude:            job.latitude,
        longitude:           job.longitude,
        jobUrl:              job.url,
        applyUrl:            job.applyUrl ?? job.url,
        salary:              job.salary,
        remote:              job.remote,
        atsType:             job.atsType,
        applyMethod,
        externalApplicationId,
        status:              applyMethod === "greenhouse_api" ? "applied" : "queued",
        statusHistory:       [{ status: applyMethod === "greenhouse_api" ? "applied" : "queued", changedAt: new Date() }],
        tailoredResumeUrl:   savedResume._id.toString(),
        tailoredResumeText:  tailored.tailoredResume,
        coverLetter:         tailored.coverLetter,
        atsScore:            tailored.atsScore,
        keywordsMatched:     tailored.keywordsInjected,
        source:              job.source,
        appliedAt:           new Date(),
      });

      await User.updateOne({ clerkId: userId }, { $inc: { totalApplied: 1 } });

      // Auto-schedule follow-up sequence
      scheduleFollowUps(userId, {
        _id:      application._id.toString(),
        company:  job.company,
        jobTitle: job.title,
        appliedAt: application.appliedAt ?? new Date(),
      }, {
        fullName: user.fullName,
        niche:    user.niche,
        field:    user.field,
      }).catch((err) => console.error("Follow-up scheduling error:", err));

      // Send notification email
      if (user.notifyOnApply && user.emailNotifications) {
        await sendAppliedNotification({
          to:       user.emailNotifications,
          userName: user.fullName,
          jobTitle: job.title,
          company:  job.company,
          jobUrl:   job.url,
          atsScore: tailored.atsScore,
        }).catch(() => {});
      }

      results.applied++;
    } catch (err) {
      console.error(`Apply engine error for ${job.company}:`, err);
      results.failed++;
    }
  }

  return NextResponse.json({
    ...results,
    dailyLimitRemaining: remaining - results.applied,
    breakdown: {
      direct_api:     results.atsDirected,
      browser_queued: results.queued,
      failed:         results.failed,
    },
  });
}
