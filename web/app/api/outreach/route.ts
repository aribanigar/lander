import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Outreach from "@/lib/db/models/outreach";
import { generateOutreachMessage } from "@/lib/ai/claude";
import User from "@/lib/db/models/user";

// GET — list all outreach for this user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  await connectDB();
  const query: Record<string, unknown> = { userId };
  if (status) query.status = status;

  const items = await Outreach.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items });
}

// POST — create a new outreach (with AI message generation)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { company, jobTitle, jobUrl, contactName, contactTitle, contactLinkedIn, contactEmail, platform = "linkedin" } = body;

  if (!company || !jobTitle) {
    return NextResponse.json({ error: "company and jobTitle are required" }, { status: 400 });
  }

  await connectDB();

  // Get user profile for personalised message
  const dbUser = await User.findOne({ clerkId: userId }).lean() as Record<string, unknown> | null;

  // AI-generate the outreach message
  const generated = await generateOutreachMessage({
    senderName:     (dbUser?.fullName as string) ?? "Candidate",
    senderNiche:    (dbUser?.niche as string) ?? (dbUser?.field as string) ?? "professional",
    senderYearsExp: (dbUser?.yearsExp as number) ?? 0,
    company,
    jobTitle,
    contactName,
    contactTitle,
    platform,
  });

  const outreach = await Outreach.create({
    userId,
    company,
    jobTitle,
    jobUrl,
    contactName,
    contactTitle,
    contactLinkedIn,
    contactEmail,
    platform,
    message: generated.message,
    status: "draft",
  });

  return NextResponse.json({ outreach, generated });
}
