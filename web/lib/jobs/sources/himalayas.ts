import { NormalizedJob } from "../types";
import { fingerprint } from "../fingerprint";

const BASE = "https://himalayas.app/jobs/api";

interface HimalayasSalary {
  min?: number;
  max?: number;
  currency?: string;
}

interface HimalayasJob {
  id?: string;
  applicationLink?: string;
  title?: string;
  companyName?: string;
  companyLogoUrl?: string;
  locationRestrictions?: string | string[];
  description?: string;
  salary?: HimalayasSalary;
  jobType?: string;
  createdAt?: string;
}

interface HimalayasResponse {
  jobs?: HimalayasJob[];
}

function resolveLocation(locationRestrictions?: string | string[]): string {
  if (!locationRestrictions) return "Remote";
  if (Array.isArray(locationRestrictions)) {
    return locationRestrictions.length > 0 ? locationRestrictions.join(", ") : "Remote";
  }
  return locationRestrictions;
}

export async function fetchJobs(
  query: string,
  options: { remote?: boolean; location?: string; limit?: number }
): Promise<NormalizedJob[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(options.limit ?? 20),
    });

    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Himalayas fetch failed: ${res.status}`);
      return [];
    }

    const data: HimalayasResponse = await res.json();
    const jobs = data.jobs ?? [];

    return jobs.map((j) => {
      const title = j.title ?? "";
      const company = j.companyName ?? "";
      const location = resolveLocation(j.locationRestrictions);
      const applyUrl = j.applicationLink;

      return {
        externalId: j.id ?? String(Math.random()),
        source: "himalayas",
        url: applyUrl ?? `https://himalayas.app/jobs`,
        applyUrl,
        title,
        company,
        companyLogo: j.companyLogoUrl,
        location,
        country: "Remote",
        remote: true,
        description: j.description ?? "",
        salary:
          j.salary?.min || j.salary?.max
            ? {
                min: j.salary.min ?? 0,
                max: j.salary.max ?? 0,
                currency: j.salary.currency ?? "USD",
              }
            : undefined,
        jobType: j.jobType,
        postedAt: j.createdAt,
        fingerprint: fingerprint(company, title, location),
      };
    });
  } catch (err) {
    console.error("Himalayas fetch error:", err);
    return [];
  }
}
