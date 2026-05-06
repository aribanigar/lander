import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import Resume from "@/lib/db/models/resume";
import { tailorResume, extractJobKeywords } from "@/lib/ai/claude";

export const maxDuration = 60;

const schema = z.object({
  jobTitle:       z.string().min(1),
  company:        z.string().min(1),
  jobDescription: z.string().min(50),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const [user, masterResume] = await Promise.all([
    User.findOne({ clerkId: userId }),
    Resume.findOne({ userId, isMaster: true }).lean(),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const masterText = (masterResume as { fullText?: string } | null)?.fullText ?? "";
  if (!masterText) {
    return NextResponse.json(
      { error: "No master resume found. Complete your resume first." },
      { status: 400 }
    );
  }

  const { jobTitle, company, jobDescription } = parsed.data;

  const [keywords, tailored] = await Promise.all([
    extractJobKeywords(jobDescription),
    tailorResume({
      userProfile: {
        fullName: user.fullName,
        field:    user.field,
        role:     user.role,
        yearsExp: user.yearsExp,
        niche:    user.niche,
      },
      masterResumeText: masterText,
      jobTitle,
      company,
      jobDescription,
      atsKeywords: [],
    }).then(async (t) => t),
  ]);

  // Re-tailor with extracted keywords for max ATS score
  const finalTailored = await tailorResume({
    userProfile: {
      fullName: user.fullName,
      field:    user.field,
      role:     user.role,
      yearsExp: user.yearsExp,
      niche:    user.niche,
    },
    masterResumeText: masterText,
    jobTitle,
    company,
    jobDescription,
    atsKeywords: keywords.atsKeywords,
  });

  const saved = await Resume.create({
    userId,
    jobTitle,
    company,
    fullText:         finalTailored.tailoredResume,
    sections:         [],
    keywordsInjected: finalTailored.keywordsInjected,
    atsScore:         finalTailored.atsScore,
    isMaster:         false,
    version:          1,
  });

  void tailored; // used in parallel fetch

  return NextResponse.json({
    resumeId:          saved._id,
    tailoredResume:    finalTailored.tailoredResume,
    coverLetter:       finalTailored.coverLetter,
    atsScore:          finalTailored.atsScore,
    keywordsInjected:  finalTailored.keywordsInjected,
    extractedKeywords: keywords,
  });
}
