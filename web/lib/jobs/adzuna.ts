import axios from "axios";

const APP_ID  = process.env.ADZUNA_APP_ID!;
const APP_KEY = process.env.ADZUNA_APP_KEY!;
const BASE    = "https://api.adzuna.com/v1/api/jobs";

// Adzuna country codes
const REGION_TO_COUNTRY: Record<string, string> = {
  "United States":        "us",
  "United Kingdom":       "gb",
  "Canada":               "ca",
  "Australia":            "au",
  "UAE / Middle East":    "ae",
  "European Union":       "de",  // Germany as EU proxy
  "Global":               "gb",
  "Remote only":          "us",
};

export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  created: string;
  latitude?: number;
  longitude?: number;
}

export async function discoverJobsAdzuna(params: {
  keywords: string;
  regions: string[];
  level: string;
  maxResults?: number;
}): Promise<AdzunaJob[]> {
  const results: AdzunaJob[] = [];
  const countries = [
    ...new Set(params.regions.map((r) => REGION_TO_COUNTRY[r] ?? "us")),
  ];

  for (const country of countries) {
    try {
      const { data } = await axios.get(`${BASE}/${country}/search/1`, {
        params: {
          app_id:       APP_ID,
          app_key:      APP_KEY,
          what:         params.keywords,
          results_per_page: Math.min(params.maxResults ?? 20, 50),
          content_type: "application/json",
          sort_by:      "date",
        },
        timeout: 10000,
      });

      const jobs = (data.results ?? []).map((j: Record<string, unknown>) => {
        const loc = (j.location as Record<string, unknown>) ?? {};
        const areas = (loc.area as string[]) ?? [];
        return {
          id:           String(j.id),
          title:        String(j.title ?? ""),
          company:      String((j.company as Record<string,unknown>)?.display_name ?? ""),
          location:     areas.slice(-2).join(", "),
          country:      country.toUpperCase(),
          url:          String(j.redirect_url ?? ""),
          description:  String(j.description ?? ""),
          salary_min:   j.salary_min as number | undefined,
          salary_max:   j.salary_max as number | undefined,
          contract_type: j.contract_type as string | undefined,
          created:      String(j.created ?? ""),
          latitude:     j.latitude as number | undefined,
          longitude:    j.longitude as number | undefined,
        };
      });

      results.push(...jobs);
    } catch {
      // Non-fatal: log and continue with other countries
      console.error(`Adzuna fetch failed for ${country}`);
    }
  }

  return results;
}
