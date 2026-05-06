import { NormalizedJob } from "./types";
import { fingerprint } from "./fingerprint";
import { discoverJobsAdzuna } from "./adzuna";
import { discoverJobsJSearch } from "./jsearch";
import { detectATS } from "../apply/ats-detect";
import { fetchJobs as fetchRemotive } from "./sources/remotive";
import { fetchJobs as fetchRemoteOk } from "./sources/remoteok";
import { fetchJobs as fetchJobicy } from "./sources/jobicy";
import { fetchJobs as fetchArbeitnow } from "./sources/arbeitnow";
import { fetchJobs as fetchHimalayas } from "./sources/himalayas";

export { fingerprint } from "./fingerprint";

function normalizeAdzuna(job: import("./adzuna").AdzunaJob): NormalizedJob {
  const fp = fingerprint(job.company, job.title, job.location);
  const ats = detectATS(job.url);
  return {
    externalId: job.id,
    source: "adzuna",
    url: job.url,
    atsType: ats?.atsType ?? null,
    atsCompanySlug: ats?.companySlug,
    atsJobId: ats?.jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    country: job.country,
    latitude: job.latitude,
    longitude: job.longitude,
    remote: false,
    description: job.description,
    salary:
      job.salary_min || job.salary_max
        ? { min: job.salary_min ?? 0, max: job.salary_max ?? 0, currency: "GBP" }
        : undefined,
    jobType: job.contract_type,
    postedAt: job.created,
    fingerprint: fp,
  };
}

function normalizeJSearch(job: import("./jsearch").JSearchJob): NormalizedJob {
  const fp = fingerprint(job.company, job.title, job.location);
  const ats = detectATS(job.url);
  return {
    externalId: job.id,
    source: "jsearch",
    url: job.url,
    atsType: ats?.atsType ?? null,
    atsCompanySlug: ats?.companySlug,
    atsJobId: ats?.jobId,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    location: job.location,
    country: job.country,
    latitude: job.latitude,
    longitude: job.longitude,
    remote: job.remote,
    description: job.description,
    salary:
      job.salaryMin || job.salaryMax
        ? {
            min: job.salaryMin ?? 0,
            max: job.salaryMax ?? 0,
            currency: job.salaryCurrency ?? "USD",
          }
        : undefined,
    jobType: job.jobType,
    postedAt: job.postedAt,
    fingerprint: fp,
  };
}

export async function aggregateJobs(params: {
  query: string;
  remote?: boolean;
  location?: string;
  limit?: number;
  regions?: string[];
}): Promise<NormalizedJob[]> {
  const { query, remote, location, limit = 20, regions = ["Global"] } = params;
  const sourceOptions = { remote, location, limit };

  const [
    adzunaResult,
    jsearchResult,
    remotiveResult,
    remoteokResult,
    jobicyResult,
    arbeitnowResult,
    himalayasResult,
  ] = await Promise.allSettled([
    discoverJobsAdzuna({ keywords: query, regions, level: "" }).then((jobs) =>
      jobs.map(normalizeAdzuna)
    ),
    discoverJobsJSearch({ query, remote, maxResults: limit }).then((jobs) =>
      jobs.map(normalizeJSearch)
    ),
    fetchRemotive(query, sourceOptions),
    fetchRemoteOk(query, sourceOptions),
    fetchJobicy(query, sourceOptions),
    fetchArbeitnow(query, sourceOptions),
    fetchHimalayas(query, sourceOptions),
  ]);

  const allJobs: NormalizedJob[] = [];

  for (const result of [
    adzunaResult,
    jsearchResult,
    remotiveResult,
    remoteokResult,
    jobicyResult,
    arbeitnowResult,
    himalayasResult,
  ]) {
    if (result.status === "fulfilled") {
      allJobs.push(...result.value);
    }
  }

  // Deduplicate by fingerprint — keep first seen
  const seen = new Set<string>();
  const deduped: NormalizedJob[] = [];

  for (const job of allJobs) {
    if (!seen.has(job.fingerprint)) {
      seen.add(job.fingerprint);

      // Enrich with ATS detection if not already done by a normalizer
      if (job.atsType === undefined) {
        const ats = detectATS(job.url);
        if (ats) {
          job.atsType = ats.atsType;
          job.atsCompanySlug = ats.companySlug;
          job.atsJobId = ats.jobId;
        } else {
          job.atsType = null;
        }
      }

      deduped.push(job);
    }
  }

  return deduped;
}
