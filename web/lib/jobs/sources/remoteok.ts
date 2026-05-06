import { NormalizedJob } from "../types";
import { fingerprint } from "../fingerprint";

const BASE = "https://remoteok.com/api";

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  url?: string;
  position?: string;
  company?: string;
  logo?: string;
  description?: string;
  tags?: string[];
  date?: string;
}

export async function fetchJobs(
  query: string,
  options: { remote?: boolean; location?: string; limit?: number }
): Promise<NormalizedJob[]> {
  try {
    const params = new URLSearchParams({ tags: query });

    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`RemoteOK fetch failed: ${res.status}`);
      return [];
    }

    const data: unknown[] = await res.json();

    // First element is metadata — skip it
    const jobs = data.slice(1) as RemoteOkJob[];
    const limit = options.limit ?? 20;

    return jobs.slice(0, limit).map((j) => {
      const title = j.position ?? "";
      const company = j.company ?? "";
      const location = "Remote";
      const url = j.url ?? `https://remoteok.com/remote-jobs/${j.slug ?? j.id}`;

      return {
        externalId: String(j.slug ?? j.id ?? Math.random()),
        source: "remoteok",
        url,
        title,
        company,
        companyLogo: j.logo,
        location,
        country: "Remote",
        remote: true,
        description: j.description ?? "",
        postedAt: j.date,
        tags: j.tags,
        fingerprint: fingerprint(company, title, location),
      };
    });
  } catch (err) {
    console.error("RemoteOK fetch error:", err);
    return [];
  }
}
