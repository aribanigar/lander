import { NormalizedJob } from "../types";
import { fingerprint } from "../fingerprint";

const BASE = "https://www.arbeitnow.com/api/job-board-api";

interface ArbeitnowJob {
  slug?: string;
  url?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  remote?: boolean;
  job_types?: string[];
  tags?: string[];
  created_at?: number;
  salary?: string;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

function deriveCountry(location?: string): string {
  if (!location) return "International";
  const lower = location.toLowerCase();
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("germany") || lower.includes("deutschland") || lower.includes(", de")) return "Germany";
  if (lower.includes("united states") || lower.includes(", us") || lower.includes(", usa")) return "United States";
  if (lower.includes("united kingdom") || lower.includes(", uk") || lower.includes(", gb")) return "United Kingdom";
  if (lower.includes("canada") || lower.includes(", ca")) return "Canada";
  if (lower.includes("australia") || lower.includes(", au")) return "Australia";
  if (lower.includes("france") || lower.includes(", fr")) return "France";
  if (lower.includes("netherlands") || lower.includes(", nl")) return "Netherlands";
  if (lower.includes("spain") || lower.includes(", es")) return "Spain";
  if (lower.includes("portugal") || lower.includes(", pt")) return "Portugal";
  if (lower.includes("poland") || lower.includes(", pl")) return "Poland";
  return "International";
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
    : "EUR";

  const numbers = salary.match(/[\d.,]+/g);
  if (!numbers || numbers.length === 0) return undefined;

  const vals = numbers
    .map((n) => parseInt(n.replace(/[.,]/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 0);

  if (vals.length === 0) return undefined;

  return {
    min: vals[0],
    max: vals.length > 1 ? vals[1] : vals[0],
    currency,
  };
}

export async function fetchJobs(
  query: string,
  options: { remote?: boolean; location?: string; limit?: number }
): Promise<NormalizedJob[]> {
  try {
    const res = await fetch(`${BASE}?page=1`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Arbeitnow fetch failed: ${res.status}`);
      return [];
    }

    const data: ArbeitnowResponse = await res.json();
    const jobs = data.data ?? [];

    const queryLower = query.toLowerCase();
    const limit = options.limit ?? 20;

    const filtered = jobs
      .filter((j) => {
        if (options.remote && !j.remote) return false;
        const text = `${j.title ?? ""} ${j.description ?? ""} ${(j.tags ?? []).join(" ")}`.toLowerCase();
        return text.includes(queryLower);
      })
      .slice(0, limit);

    return filtered.map((j) => {
      const title = j.title ?? "";
      const company = j.company_name ?? "";
      const location = j.location ?? "International";

      return {
        externalId: j.slug ?? String(Math.random()),
        source: "arbeitnow",
        url: j.url ?? "",
        title,
        company,
        location,
        country: deriveCountry(location),
        remote: j.remote ?? false,
        description: j.description ?? "",
        salary: parseSalaryString(j.salary),
        jobType: j.job_types?.[0],
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : undefined,
        tags: j.tags,
        fingerprint: fingerprint(company, title, location),
      };
    });
  } catch (err) {
    console.error("Arbeitnow fetch error:", err);
    return [];
  }
}
