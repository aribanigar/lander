import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const APOLLO = "https://api.apollo.io/api/v1";

// POST — find potential referrers at a target company
// Uses free-tier Apollo: mixed_people/organization_top_people
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, jobTitle } = await req.json();
  if (!company) return NextResponse.json({ error: "company is required" }, { status: 400 });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) {
    return NextResponse.json({
      error: "Add APOLLO_API_KEY to .env.local to enable referral finding.",
    }, { status: 503 });
  }

  // Find people at the company
  const res = await fetch(`${APOLLO}/mixed_people/organization_top_people`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
    body: JSON.stringify({
      q_organization_name: company,
      per_page: 15,
      page: 1,
    }),
  });

  if (!res.ok) {
    // Fallback: contacts/search
    const fallback = await fetch(`${APOLLO}/contacts/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
      body: JSON.stringify({
        q_organization_name: company,
        per_page: 10,
        page: 1,
      }),
    });
    if (!fallback.ok) {
      return NextResponse.json({ referrers: [], message: "No employees found for this company" });
    }
    const fb = await fallback.json();
    const contacts = (fb.contacts ?? []) as Array<Record<string, unknown>>;
    return NextResponse.json({ referrers: contacts.map(scoreReferrer(jobTitle ?? "")) });
  }

  const data   = await res.json();
  const people = (data.people ?? []) as Array<Record<string, unknown>>;

  const referrers = people
    .map(scoreReferrer(jobTitle ?? ""))
    .sort((a, b) => b.referralScore - a.referralScore);

  return NextResponse.json({ referrers: referrers.slice(0, 8) });
}

/* ── Score each person's referral potential ─────────────────────────────── */
function scoreReferrer(jobTitle: string) {
  return (p: Record<string, unknown>) => {
    const title      = ((p.title as string) ?? "").toLowerCase();
    const jobWords   = jobTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    let   score      = 50; // baseline

    // Senior individual contributors are best referrers (not too senior to ignore, not too junior)
    const seniorKeywords = ["senior", "lead", "staff", "principal", "manager", "director"];
    if (seniorKeywords.some((k) => title.includes(k))) score += 20;

    // Same department is ideal
    if (jobWords.some((w) => title.includes(w))) score += 25;

    // LinkedIn presence = contactable
    if (p.linkedin_url) score += 10;

    // Email available = even better
    if (p.email) score += 15;

    // Avoid C-suite (too senior, unlikely to refer)
    const cSuite = ["chief", "ceo", "cto", "coo", "cfo", "president", "founder"];
    if (cSuite.some((k) => title.includes(k))) score -= 20;

    const name = p.name
      ? (p.name as string)
      : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

    return {
      name:          name || null,
      title:         p.title ?? null,
      linkedin:      p.linkedin_url ?? null,
      email:         p.email ?? null,
      avatar:        p.photo_url ?? null,
      referralScore: Math.min(100, Math.max(0, score)),
      messageTip:    buildMessageTip(name, (p.title as string) ?? "", jobTitle),
    };
  };
}

function buildMessageTip(name: string, theirTitle: string, targetRole: string): string {
  const firstName = name.split(" ")[0] || "there";
  if (theirTitle.toLowerCase().includes("engineer") || theirTitle.toLowerCase().includes("design")) {
    return `Hi ${firstName}, I'm applying for the ${targetRole} role at your company. Would love 5 mins to learn what the team is like before I submit — happy to reciprocate any way I can!`;
  }
  return `Hi ${firstName}, I noticed you're at [company] and I'm exploring the ${targetRole} opening there. Would you be open to a quick chat about the team culture? It'd mean a lot.`;
}
