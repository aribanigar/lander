import { NormalizedJob } from "../types";
import { fingerprint } from "../fingerprint";

const BASE = "https://remotive.com/api/remote-jobs";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo_url?: string;
  candidate_required_location?: string;
  description: string;
  salary?: string;
  job_type?: string;
  tags?: string[];
  publication_date?: string;
}

export async function fetchJobs(
  query: string,
  options: { remote?: boolean; location?: string; limit?: number }
): Promise<NormalizedJob[]> {
  try {
    const params = new URLSearchParams({
      search: query,
      limit: String(options.limit ?? 20),
    });

    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Remotive fetch failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs: RemotiveJob[] = data.jobs ?? [];

    return jobs.map((j) => ({
      externalId: String(j.id),
      source: "remotive",
      url: j.url,
      title: j.title,
      company: j.company_name,
      companyLogo: j.company_logo_url,
      location: j.candidate_required_location ?? "Remote",
      country: "Remote",
      remote: true,
      description: j.description,
      salary: parseSalaryString(j.salary),
      jobType: j.job_type,
      postedAt: j.publication_date,
      tags: j.tags,
      fingerprint: fingerprint(j.company_name, j.title, j.candidate_required_location ?? "Remote"),
    }));
  } catch (err) {
    console.error("Remotive fetch error:", err);
    return [];
  }
}

function parseSalaryString(
  salary?: string
): { min: number; max: number; currency: string } | undefined {
  if (!salary) return undefined;

  const currency = salary.includes("$")
    ? "USD"
    : salary.includes("£")
    ? "GBP"
    : salary.includes("€")
    ? "EUR"
    : "USD";

  const numbers = salary.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return undefined;

  const vals = numbers.map((n) => parseInt(n.replace(/,/g, ""), 10)).filter(Boolean);
  if (vals.length === 0) return undefined;

  return {
    min: vals[0],
    max: vals.length > 1 ? vals[1] : vals[0],
    currency,
  };
}
