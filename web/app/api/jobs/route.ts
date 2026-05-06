import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Job from "@/lib/db/models/job";
import Application from "@/lib/db/models/application";

/** GET /api/jobs — list discovered jobs not yet applied to, sorted by ATS score */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const appliedJobIds = await Application.find({ userId }).distinct("jobId");
  const jobs = await Job.find({ userId, _id: { $nin: appliedJobIds } })
    .sort({ atsScore: -1, discoveredAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(jobs);
}
