/**
 * POST /api/jobs/discover
 * Aggregates jobs from 7 sources simultaneously:
 * Adzuna, JSearch (Google Jobs), Remotive, RemoteOK, Jobicy, Arbeitnow, Himalayas
 * Deduplicates by fingerprint, detects ATS type per job, saves to MongoDB.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import Job from "@/lib/db/models/job";
import { aggregateJobs } from "@/lib/jobs/aggregator";
import { extractJobKeywords } from "@/lib/ai/claude";
import type { NormalizedJob } from "@/lib/jobs/types";

export const maxDuration = 120; // aggregating 7 sources needs more headroom

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ clerkId: userId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const query   = `${user.role ?? ""} ${user.field ?? ""}`.trim() || "software engineer";
  const regions = (user.targetRegions?.length ? user.targetRegions : ["Global"]) as string[];
  const remote  = user.remotePreference === "Fully remote";

  // Run all 7 sources in parallel — deduped by fingerprint
  const jobs = await aggregateJobs({ query, remote, regions, limit: 25 });

  let saved = 0;
  const stats = { total: jobs.length, bySource: {} as Record<string, number> };

  for (const j of jobs) {
    // Skip if already in DB for this user
    const exists = await Job.exists({ userId, externalId: j.externalId, source: j.source });
    if (exists) continue;

    // Keyword extraction via Claude (skip if description is too short)
    let extracted = { required: [] as string[], niceToHave: [] as string[], atsKeywords: [] as string[], senioritySignals: [] as string[] };
    if (j.description && j.description.length > 100) {
      try { extracted = await extractJobKeywords(j.description); }
      catch { /* non-fatal */ }
    }

    // Score against user profile keywords
    const nicheWords = (user.niche ?? "").toLowerCase().split(" ");
    const descLower  = j.description.toLowerCase();
    const matchedKw  = nicheWords.filter((w: string) => w.length > 3 && descLower.includes(w));
    const atsScore   = Math.min(100, Math.round((matchedKw.length / Math.max(nicheWords.length, 1)) * 100));

    const salaryStr = j.salary
      ? `${j.salary.currency}${j.salary.min}–${j.salary.max}`
      : undefined;

    await Job.create({
      userId,
      externalId:        j.externalId,
      source:            j.source,
      url:               j.url,
      applyUrl:          j.applyUrl ?? j.url,
      atsType:           j.atsType ?? null,
      atsCompanySlug:    j.atsCompanySlug,
      atsJobId:          j.atsJobId,
      title:             j.title,
      company:           j.company,
      companyLogo:       j.companyLogo,
      location:          j.location,
      country:           j.country,
      latitude:          j.latitude,
      longitude:         j.longitude,
      remote:            j.remote,
      description:       j.description,
      extractedKeywords: extracted.atsKeywords,
      requiredSkills:    extracted.required,
      niceToHaveSkills:  extracted.niceToHave,
      atsScore,
      jobType:           j.jobType ?? "Full-time",
      salary:            j.salary ? { min: j.salary.min, max: j.salary.max, currency: j.salary.currency, period: "yearly" } : undefined,
      tags:              j.tags ?? [],
      salary_display:    salaryStr,
      postedAt:          j.postedAt ? new Date(j.postedAt) : undefined,
      discoveredAt:      new Date(),
    }).catch(() => { /* ignore duplicate key */ });

    saved++;
    stats.bySource[j.source] = (stats.bySource[j.source] ?? 0) + 1;
  }

  return NextResponse.json({ ...stats, saved, sources: Object.keys(stats.bySource) });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const jobs = await Job.find({ userId })
    .sort({ atsScore: -1, discoveredAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(jobs);
}
