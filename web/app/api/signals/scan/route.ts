import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Signal from "@/lib/db/models/signal";
import User from "@/lib/db/models/user";
import { detectHiringSignals } from "@/lib/ai/claude";

const APOLLO = "https://api.apollo.io/api/v1";

// POST — scan target companies for hiring signals
// Uses only FREE-tier Apollo endpoints:
//   api/v1/organizations/search        (replaces paid mixed_companies/search)
//   api/v1/organizations/job_postings  (free)
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const dbUser = await User.findOne({ clerkId: userId }).lean() as Record<string, unknown> | null;
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) {
    return NextResponse.json({
      error: "Add APOLLO_API_KEY to .env.local to enable signal scanning.",
      setupUrl: "https://app.apollo.io/settings/integrations/api",
    }, { status: 503 });
  }

  const field          = (dbUser.field as string) ?? "";
  const niche          = (dbUser.niche as string) ?? "";
  const targetRegions  = (dbUser.targetRegions as string[]) ?? [];

  // ── Step 1: Find companies using FREE organizations/search ──────────────
  const searchRes = await fetch(`${APOLLO}/organizations/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
    body: JSON.stringify({
      // Search by the user's field keywords
      q_organization_keyword_tags: [field, niche].filter(Boolean).slice(0, 3),
      // Filter by their target locations
      organization_locations: targetRegions
        .filter((r) => r !== "Remote only" && r !== "Global (Any)")
        .slice(0, 3),
      // Only companies actively hiring (has open roles)
      currently_using_any_of_technology_uids: [],
      per_page: 10,
      page: 1,
    }),
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    return NextResponse.json(
      { error: "Apollo organizations/search failed", details: errText },
      { status: 502 }
    );
  }

  const searchData = await searchRes.json();
  const companies  = (searchData.organizations ?? []) as Array<Record<string, unknown>>;

  const newSignals: Array<Record<string, unknown>> = [];

  // ── Step 2: For each company, fetch job postings & detect signals ────────
  for (const co of companies.slice(0, 8)) {
    const name     = (co.name as string) ?? "Unknown";
    const domain   = (co.primary_domain as string) ?? "";
    const orgId    = co.id as string;

    // Fetch their current job postings (FREE endpoint)
    const jobRes = await fetch(`${APOLLO}/organizations/job_postings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
      body: JSON.stringify({ organization_id: orgId, page: 1, per_page: 20 }),
    }).catch(() => null);

    const recentTitles: string[] = [];
    let   jobCount = (co.job_postings_count as number) ?? 0;

    if (jobRes?.ok) {
      const jd       = await jobRes.json();
      const postings = (jd.job_postings ?? []) as Array<Record<string, unknown>>;
      postings.forEach((p) => { if (p.title) recentTitles.push(p.title as string); });
      if (postings.length > jobCount) jobCount = postings.length;
    }

    // Skip companies with no real hiring activity
    if (jobCount < 2 && recentTitles.length < 2) continue;

    // ── Step 3: AI analyses the pattern and classifies signals ────────────
    const detected = await detectHiringSignals({
      company:         name,
      openJobCount:    jobCount,
      recentJobTitles: recentTitles,
      companySize:     (co.estimated_num_employees as string) ?? undefined,
    });

    for (const sig of detected.signals) {
      // Deduplicate within 7-day window
      const exists = await Signal.findOne({
        userId,
        company:     name,
        signalType:  sig.signalType,
        detectedAt:  { $gte: new Date(Date.now() - 7 * 86_400_000) },
      });
      if (exists) continue;

      const created = await Signal.create({
        userId,
        company:       name,
        companyDomain: domain,
        signalType:    sig.signalType,
        description:   sig.description,
        strength:      sig.strength,
        confidence:    sig.confidence,
        detectedAt:    new Date(),
        jobCount,
        source:        "apollo",
      });
      newSignals.push(JSON.parse(JSON.stringify(created)));
    }
  }

  return NextResponse.json({ scanned: companies.length, newSignals });
}
