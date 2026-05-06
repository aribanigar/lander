import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import Interview from "@/lib/db/models/interview";
import User from "@/lib/db/models/user";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  const [clerkUser, dbUser, recentApps, upcomingInterviews] = await Promise.all([
    currentUser(),
    User.findOne({ clerkId: userId }).lean(),
    Application.find({ userId })
      .sort({ appliedAt: -1 })
      .limit(10)
      .lean(),
    Interview.find({ userId, scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(6)
      .lean(),
  ]);

  // Aggregate pipeline stats
  const stats = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap: Record<string, number> = {};
  for (const s of stats) statsMap[s._id] = s.count;

  const totalApplied   = Object.values(statsMap).reduce((a, b) => a + b, 0);
  const totalViewed    = statsMap["viewed"]    ?? 0;
  const totalReplied   = statsMap["replied"]   ?? 0;
  const totalInterview = statsMap["interview"] ?? 0;
  const totalRejected  = statsMap["rejected"]  ?? 0;

  // Reply rate %
  const replyRate = totalApplied > 0 ? Math.round((totalReplied / totalApplied) * 100) : 0;

  // ATS score avg
  const atsResult = await Application.aggregate([
    { $match: { userId, atsScore: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: "$atsScore" } } },
  ]);
  const avgAts = atsResult[0] ? Math.round(atsResult[0].avg) : null;

  // Real 7-day application counts for bar chart
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyResult = await Application.aggregate([
    { $match: { userId, appliedAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Build a 7-slot array (index 0 = 6 days ago, index 6 = today)
  const dailyMap: Record<string, number> = {};
  for (const d of dailyResult) dailyMap[d._id] = d.count;
  const dailyBars: number[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return dailyMap[key] ?? 0;
  });

  return (
    <DashboardClient
      user={{
        name: clerkUser?.fullName ?? dbUser?.fullName ?? "You",
        field: (dbUser as { field?: string } | null)?.field ?? "",
        yearsExp: String((dbUser as { yearsExp?: number } | null)?.yearsExp ?? ""),
        niche: (dbUser as { niche?: string } | null)?.niche ?? "",
      }}
      autopilotEnabled={!!(dbUser as { autopilotEnabled?: boolean } | null)?.autopilotEnabled}
      stats={{ totalApplied, totalViewed, totalReplied, totalInterview, totalRejected, replyRate, avgAts }}
      recentApps={JSON.parse(JSON.stringify(recentApps))}
      upcomingInterviews={JSON.parse(JSON.stringify(upcomingInterviews))}
      dailyBars={dailyBars}
    />
  );
}
