import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FollowUp from "@/lib/db/models/followup";
import Application from "@/lib/db/models/application";
import { generateFollowUp } from "@/lib/ai/claude";
import User from "@/lib/db/models/user";

// GET — list follow-ups for this user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const dueOnly = req.nextUrl.searchParams.get("due") === "true";

  await connectDB();

  const query: Record<string, unknown> = { userId };
  if (status !== "all") query.status = status;
  if (dueOnly) query.scheduledFor = { $lte: new Date() };

  const items = await FollowUp.find(query)
    .sort({ scheduledFor: 1 })
    .limit(50)
    .lean();

  return NextResponse.json({ items });
}

// POST — schedule follow-ups for an application (call right after applying)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await req.json();
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

  await connectDB();

  const [app, dbUser] = await Promise.all([
    Application.findOne({ _id: applicationId, userId }).lean(),
    User.findOne({ clerkId: userId }).lean() as Promise<Record<string, unknown> | null>,
  ]);

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const appliedAt = new Date((app as Record<string, unknown>).appliedAt as Date ?? (app as Record<string, unknown>).createdAt as Date);

  // Generate all 3 follow-up drafts in parallel
  const [day3, day7, day14] = await Promise.all([
    generateFollowUp({
      senderName:  (dbUser?.fullName as string) ?? "Candidate",
      senderNiche: (dbUser?.niche as string) ?? (dbUser?.field as string) ?? "professional",
      company:     (app as Record<string, unknown>).company as string,
      jobTitle:    (app as Record<string, unknown>).jobTitle as string,
      dayNumber:   3,
      appliedAt:   appliedAt.toDateString(),
    }),
    generateFollowUp({
      senderName:  (dbUser?.fullName as string) ?? "Candidate",
      senderNiche: (dbUser?.niche as string) ?? (dbUser?.field as string) ?? "professional",
      company:     (app as Record<string, unknown>).company as string,
      jobTitle:    (app as Record<string, unknown>).jobTitle as string,
      dayNumber:   7,
      appliedAt:   appliedAt.toDateString(),
    }),
    generateFollowUp({
      senderName:  (dbUser?.fullName as string) ?? "Candidate",
      senderNiche: (dbUser?.niche as string) ?? (dbUser?.field as string) ?? "professional",
      company:     (app as Record<string, unknown>).company as string,
      jobTitle:    (app as Record<string, unknown>).jobTitle as string,
      dayNumber:   14,
      appliedAt:   appliedAt.toDateString(),
    }),
  ]);

  const scheduleDate = (days: number) => {
    const d = new Date(appliedAt);
    d.setDate(d.getDate() + days);
    return d;
  };

  const followUps = await FollowUp.insertMany([
    {
      userId, applicationId,
      company:      (app as Record<string, unknown>).company,
      jobTitle:     (app as Record<string, unknown>).jobTitle,
      dayNumber:    3,
      scheduledFor: scheduleDate(3),
      draftSubject: day3.subject,
      draftMessage: day3.body,
      status:       "pending",
    },
    {
      userId, applicationId,
      company:      (app as Record<string, unknown>).company,
      jobTitle:     (app as Record<string, unknown>).jobTitle,
      dayNumber:    7,
      scheduledFor: scheduleDate(7),
      draftSubject: day7.subject,
      draftMessage: day7.body,
      status:       "pending",
    },
    {
      userId, applicationId,
      company:      (app as Record<string, unknown>).company,
      jobTitle:     (app as Record<string, unknown>).jobTitle,
      dayNumber:    14,
      scheduledFor: scheduleDate(14),
      draftSubject: day14.subject,
      draftMessage: day14.body,
      status:       "pending",
    },
  ]);

  return NextResponse.json({ followUps });
}
