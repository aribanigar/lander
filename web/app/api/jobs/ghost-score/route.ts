import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { scoreGhostJob } from "@/lib/ai/claude";

// POST — score a job for ghost probability before applying
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobTitle, company, postedDaysAgo, description, salary, repostCount } = body;

  if (!jobTitle || !company) {
    return NextResponse.json({ error: "jobTitle and company required" }, { status: 400 });
  }

  const result = await scoreGhostJob({
    jobTitle,
    company,
    postedDaysAgo: postedDaysAgo ?? 0,
    description:   description ?? "",
    salary,
    repostCount,
  });

  return NextResponse.json(result);
}
