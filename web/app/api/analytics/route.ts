import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import { predictTimeline } from "@/lib/ai/claude";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const [statusBreakdown, atsResult, dailyApps] = await Promise.all([
    Application.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { userId, atsScore: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$atsScore" }, min: { $min: "$atsScore" }, max: { $max: "$atsScore" } } },
    ]),
    Application.aggregate([
      { $match: { userId, appliedAt: { $gte: subDays(new Date(), 14) } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const stats: Record<string, number> = {};
  for (const s of statusBreakdown) stats[s._id] = s.count;

  const totalApplied   = Object.values(stats).reduce((a, b) => a + b, 0);
  const totalViewed    = stats.viewed    ?? 0;
  const totalReplied   = (stats.replied ?? 0) + (stats.positive ?? 0);
  const totalInterview = stats.interview ?? 0;
  const totalRejected  = stats.rejected  ?? 0;
  const totalOffers    = stats.offer     ?? 0;

  const replyRate     = totalApplied  > 0 ? +(totalReplied   / totalApplied  * 100).toFixed(1) : 0;
  const interviewRate = totalReplied  > 0 ? +(totalInterview  / totalReplied  * 100).toFixed(1) : 0;

  const atsStats = atsResult[0] ?? { avg: 0, min: 0, max: 0 };

  // Fill missing days with 0
  const last14: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dateStr = startOfDay(subDays(new Date(), i)).toISOString().slice(0, 10);
    const found   = dailyApps.find((x: { _id: string; count: number }) => x._id === dateStr);
    last14.push({ date: dateStr, count: found?.count ?? 0 });
  }

  const dailyAverage = last14.length > 0
    ? +(last14.reduce((s, d) => s + d.count, 0) / last14.length).toFixed(1)
    : 0;

  // AI prediction (only meaningful after 5+ applications)
  const firstApp = await Application.findOne({ userId }).sort({ appliedAt: 1 }).lean();
  const daysActive = firstApp && (firstApp as { appliedAt?: Date }).appliedAt
    ? Math.max(1, Math.floor((Date.now() - new Date((firstApp as { appliedAt: Date }).appliedAt).getTime()) / 86_400_000))
    : 0;

  let prediction = null;
  if (totalApplied >= 5) {
    prediction = await predictTimeline({
      daysActive,
      totalApplied,
      totalReplied,
      totalInterviews: totalInterview,
      totalOffers,
      dailyAverage,
    }).catch(() => null);
  }

  return NextResponse.json({
    totals: { totalApplied, totalViewed, totalReplied, totalInterview, totalRejected, totalOffers },
    rates:  { replyRate, interviewRate },
    ats:    { avg: Math.round(atsStats.avg), min: atsStats.min, max: atsStats.max },
    daily:  last14,
    dailyAverage,
    prediction,
  });
}
