import axios from "axios";

const JSEARCH_KEY  = process.env.JSEARCH_API_KEY!;
const BASE         = "https://jsearch.p.rapidapi.com";

export interface JSearchJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  url: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  jobType?: string;
  remote: boolean;
  postedAt?: string;
  latitude?: number;
  longitude?: number;
}

export async function discoverJobsJSearch(params: {
  query: string;
  location?: string;
  remote?: boolean;
  maxResults?: number;
}): Promise<JSearchJob[]> {
  try {
    const { data } = await axios.get(`${BASE}/search`, {
      headers: {
        "X-RapidAPI-Key":  JSEARCH_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      params: {
        query:          params.query + (params.remote ? " remote" : ""),
        page:           "1",
        num_pages:      "1",
        date_posted:    "week",
        remote_jobs_only: params.remote ? "true" : "false",
      },
      timeout: 10000,
    });

    return (data.data ?? []).slice(0, params.maxResults ?? 20).map(
      (j: Record<string, unknown>) => ({
        id:            String(j.job_id ?? j.job_apply_link ?? Math.random()),
        title:         String(j.job_title ?? ""),
        company:       String(j.employer_name ?? ""),
        companyLogo:   j.employer_logo as string | undefined,
        location:      [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
        country:       String(j.job_country ?? ""),
        url:           String(j.job_apply_link ?? j.job_google_link ?? ""),
        description:   String(j.job_description ?? ""),
        salaryMin:     j.job_min_salary as number | undefined,
        salaryMax:     j.job_max_salary as number | undefined,
        salaryCurrency: j.job_salary_currency as string | undefined,
        salaryPeriod:  j.job_salary_period as string | undefined,
        jobType:       j.job_employment_type as string | undefined,
        remote:        Boolean(j.job_is_remote),
        postedAt:      j.job_posted_at_datetime_utc as string | undefined,
        latitude:      j.job_latitude as number | undefined,
        longitude:     j.job_longitude as number | undefined,
      })
    );
  } catch {
    console.error("JSearch fetch failed");
    return [];
  }
}
