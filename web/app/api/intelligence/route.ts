import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import { generateResponseInsights } from "@/lib/ai/claude";

// GET — generate response pattern intelligence from application data
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const [statusGroups, total] = await Promise.all([
    Application.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.countDocuments({ userId }),
  ]);

  if (total < 5) {
    return NextResponse.json({
      error: "not_enough_data",
      message: "Apply to at least 5 jobs to unlock intelligence insights",
    }, { status: 400 });
  }

  const statsMap: Record<string, number> = {};
  for (const s of statusGroups) statsMap[s._id] = s.count;

  const totalApplied   = total;
  const totalViewed    = statsMap["viewed"]    ?? 0;
  const totalReplied   = statsMap["replied"]   ?? 0;
  const totalInterview = statsMap["interview"] ?? 0;
  const replyRate      = totalApplied > 0 ? Math.round((totalReplied / totalApplied) * 100) : 0;

  const atsResult = await Application.aggregate([
    { $match: { userId, atsScore: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: "$atsScore" } } },
  ]);
  const avgAts = atsResult[0] ? Math.round(atsResult[0].avg) : null;

  const insights = await generateResponseInsights({
    totalApplied,
    totalViewed,
    totalReplied,
    totalInterview,
    replyRate,
    avgAts,
    topCompanySizes: [],
    topIndustries:   [],
    topStatuses:     statsMap,
  });

  return NextResponse.json({ insights, stats: { totalApplied, totalViewed, totalReplied, totalInterview, replyRate, avgAts } });
}
