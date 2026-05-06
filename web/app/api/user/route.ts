import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ clerkId: userId }).lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();

  const allowed = [
    "fullName", "field", "role", "yearsExp", "level", "niche",
    "jobType", "targetRegions", "remotePreference", "currency",
    "salaryMin", "salaryMax", "linkedinUrl",
    "notifyOnApply", "notifyOnPositiveReply", "notifyOnRejection",
    "emailNotifications", "dailyApplyLimit",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: update },
    { new: true }
  ).lean();

  return NextResponse.json(user);
}
