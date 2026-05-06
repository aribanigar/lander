import { NormalizedJob } from "../types";
import { fingerprint } from "../fingerprint";

const BASE = "https://jobicy.com/api/v2/remote-jobs";

interface JobicyJob {
  id?: string | number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobGeo?: string;
  jobDescription?: string;
  jobType?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
  pubDate?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

export async function fetchJobs(
  query: string,
  options: { remote?: boolean; location?: string; limit?: number }
): Promise<NormalizedJob[]> {
  try {
    const params = new URLSearchParams({
      tag: query,
      count: String(options.limit ?? 20),
    });

    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Jobicy fetch failed: ${res.status}`);
      return [];
    }

    const data: JobicyResponse = await res.json();
    const jobs = data.jobs ?? [];

    return jobs.map((j) => {
      const title = j.jobTitle ?? "";
      const company = j.companyName ?? "";
      const location = j.jobGeo ?? "Remote";

      return {
        externalId: String(j.id ?? Math.random()),
        source: "jobicy",
        url: j.url ?? "",
        title,
        company,
        companyLogo: j.companyLogo,
        location,
        country: "Remote",
        remote: true,
        description: j.jobDescription ?? "",
        salary:
          j.annualSalaryMin || j.annualSalaryMax
            ? {
                min: j.annualSalaryMin ?? 0,
                max: j.annualSalaryMax ?? 0,
                currency: j.salaryCurrency ?? "USD",
              }
            : undefined,
        jobType: j.jobType,
        postedAt: j.pubDate,
        fingerprint: fingerprint(company, title, location),
      };
    });
  } catch (err) {
    console.error("Jobicy fetch error:", err);
    return [];
  }
}
