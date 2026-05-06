import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Interview from "@/lib/db/models/interview";
import { generateInterviewPrep } from "@/lib/ai/claude";
import User from "@/lib/db/models/user";

// POST — generate interview prep for a scheduled interview
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interviewId, jobDescription } = await req.json();
  if (!interviewId) return NextResponse.json({ error: "interviewId required" }, { status: 400 });

  await connectDB();

  const [interview, dbUser] = await Promise.all([
    Interview.findOne({ _id: interviewId, userId }).lean() as Promise<Record<string, unknown> | null>,
    User.findOne({ clerkId: userId }).lean() as Promise<Record<string, unknown> | null>,
  ]);

  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const prep = await generateInterviewPrep({
    company:        (interview.company as string) ?? "",
    jobTitle:       (interview.jobTitle as string) ?? "",
    jobDescription: jobDescription ?? "",
    candidateName:  (dbUser?.fullName as string) ?? "Candidate",
    candidateNiche: (dbUser?.niche as string) ?? (dbUser?.field as string) ?? "professional",
    interviewType:  (interview.type as string) ?? "video",
  });

  // Save the prep to the interview document
  await Interview.findByIdAndUpdate(interviewId, {
    $set: { preparationNotes: JSON.stringify(prep) },
  });

  return NextResponse.json({ prep });
}
