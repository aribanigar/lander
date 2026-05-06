import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const APOLLO = "https://api.apollo.io/api/v1";

// POST — find a hiring manager or relevant contact at a company
// Uses only FREE-tier Apollo endpoints:
//   api/v1/mixed_people/organization_top_people  (free)
//   api/v1/contacts/search                       (free, fallback)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, jobTitle } = await req.json();
  if (!company) return NextResponse.json({ error: "company is required" }, { status: 400 });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) {
    return NextResponse.json({
      error: "Add APOLLO_API_KEY to .env.local to enable contact finding.",
      setupUrl: "https://app.apollo.io/settings/integrations/api",
    }, { status: 503 });
  }

  // ── Step 1: Find top people at the company (FREE endpoint) ──────────────
  const topRes = await fetch(`${APOLLO}/mixed_people/organization_top_people`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
    body: JSON.stringify({
      q_organization_name: company,
      per_page: 10,
      page: 1,
    }),
  });

  if (topRes.ok) {
    const data    = await topRes.json();
    const people  = (data.people ?? []) as Array<Record<string, unknown>>;

    // Pick the best match — prefer hiring manager, recruiter, or team lead
    const ranked = rankContacts(people, jobTitle ?? "");
    if (ranked.length > 0) {
      return NextResponse.json({ contacts: ranked.slice(0, 3) });
    }
  }

  // ── Step 2: Fallback — contacts/search (FREE) ───────────────────────────
  const searchRes = await fetch(`${APOLLO}/contacts/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
    body: JSON.stringify({
      q_organization_name: company,
      // Target titles most likely to be the hiring decision-maker
      person_titles: [
        "Hiring Manager",
        "Talent Acquisition",
        "Recruiter",
        "Head of People",
        "HR Director",
        "Engineering Manager",
        "Design Director",
        "Creative Director",
      ],
      per_page: 5,
      page: 1,
    }),
  });

  if (!searchRes.ok) {
    return NextResponse.json({ contacts: [], message: "No contacts found for this company" });
  }

  const searchData = await searchRes.json();
  const contacts   = (searchData.contacts ?? []) as Array<Record<string, unknown>>;

  return NextResponse.json({
    contacts: contacts.map(formatContact),
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function rankContacts(
  people: Array<Record<string, unknown>>,
  jobTitle: string
): Array<Record<string, unknown>> {
  const hiringKeywords = [
    "hiring", "talent", "recruiter", "people", "hr", "human resource",
    "head of", "director", "manager", "lead",
  ];

  const scored = people.map((p) => {
    const title = ((p.title as string) ?? "").toLowerCase();
    let score   = 0;

    // Boost hiring-adjacent titles
    for (const kw of hiringKeywords) {
      if (title.includes(kw)) { score += 10; break; }
    }

    // Boost if their title is relevant to the job being applied for
    const jobWords = jobTitle.toLowerCase().split(/\s+/);
    for (const w of jobWords) {
      if (w.length > 3 && title.includes(w)) score += 5;
    }

    return { ...p, _score: score };
  });

  return scored
    .sort((a, b) => (b._score as number) - (a._score as number))
    .map(formatContact);
}

function formatContact(p: Record<string, unknown>) {
  return {
    name:       p.name ?? p.first_name ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : null,
    title:      p.title ?? null,
    email:      p.email ?? (p.email_status === "verified" ? p.email : null),
    linkedin:   p.linkedin_url ?? null,
    avatar:     p.photo_url ?? null,
    company:    (p.organization as Record<string, unknown>)?.name ?? null,
  };
}
