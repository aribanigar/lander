/**
 * GET /api/prediction
 * Runs the job offer probability prediction for the authenticated user.
 * Pulls all application stats + profile, passes to Claude, returns calibrated probabilities.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import User from "@/lib/db/models/user";
import { predictOfferProbability } from "@/lib/ai/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const [user, statusGroups, total, recentApps, atsResult, platformResult] = await Promise.all([
    User.findOne({ clerkId: userId }).select("field role level yearsExp niche salaryMin salaryMax currency remotePreference"),
    Application.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.countDocuments({ userId }),
    // Last 30 days for velocity calculation
    Application.countDocuments({
      userId,
      appliedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
    // Average ATS score
    Application.aggregate([
      { $match: { userId, atsScore: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$atsScore" } } },
    ]),
    // How many distinct sources used
    Application.aggregate([
      { $match: { userId, source: { $exists: true, $ne: null } } },
      { $group: { _id: "$source" } },
      { $count: "count" },
    ]),
  ]);

  if (total === 0) {
    return NextResponse.json({ error: "no_data", message: "Apply to at least 1 job to run a prediction." }, { status: 400 });
  }

  // Build status map
  const sm: Record<string, number> = {};
  for (const s of statusGroups) sm[s._id] = s.count;

  const totalApplied   = total;
  const totalViewed    = sm["viewed"]    ?? 0;
  const totalReplied   = (sm["replied"] ?? 0) + (sm["positive"] ?? 0);
  const totalInterview = sm["interview"] ?? 0;
  const totalRejected  = sm["rejected"]  ?? 0;
  const totalOffers    = sm["offer"]     ?? 0;
  const replyRate      = totalApplied > 0 ? Math.round((totalReplied / totalApplied) * 100)   : 0;
  const interviewRate  = totalApplied > 0 ? Math.round((totalInterview / totalApplied) * 100) : 0;
  const dailyVelocity  = recentApps / 30;
  const avgAtsScore    = atsResult[0] ? Math.round(atsResult[0].avg) : null;
  const platformCount  = platformResult[0]?.count ?? 1;

  // Days since first application
  const firstApp = await Application.findOne({ userId, appliedAt: { $exists: true } })
    .sort({ appliedAt: 1 })
    .select("appliedAt")
    .lean();

  const daysActive = firstApp?.appliedAt
    ? Math.max(1, Math.round((Date.now() - new Date(firstApp.appliedAt).getTime()) / (24 * 60 * 60 * 1000)))
    : 1;

  const u = user as Record<string, unknown> | null;

  const prediction = await predictOfferProbability({
    field:            (u?.field as string)           ?? "",
    seniority:        (u?.level as string)           ?? "Senior",
    yearsExp:         (u?.yearsExp as number)        ?? 0,
    salaryMin:        (u?.salaryMin as number)       ?? 0,
    salaryMax:        (u?.salaryMax as number)       ?? 0,
    currency:         (u?.currency as string)        ?? "USD",
    remotePreference: (u?.remotePreference as string) ?? "No preference",
    daysActive,
    totalApplied,
    totalViewed,
    totalReplied,
    totalInterview,
    totalRejected,
    totalOffers,
    dailyVelocity,
    avgAtsScore,
    replyRate,
    interviewRate,
    platformCount,
    currentDate: new Date().toISOString().slice(0, 10),
  });

  return NextResponse.json({
    prediction,
    stats: {
      totalApplied, totalViewed, totalReplied,
      totalInterview, totalRejected, totalOffers,
      replyRate, interviewRate, daysActive, dailyVelocity,
      avgAtsScore, platformCount,
    },
  });
}
