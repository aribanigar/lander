export interface ATSMatch {
  atsType: string;
  companySlug: string;
  jobId: string;
}

export function detectATS(url: string): ATSMatch | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // Greenhouse
  // https://boards.greenhouse.io/{boardToken}/jobs/{jobId}
  // https://job-boards.greenhouse.io/{boardToken}/jobs/{jobId}
  if (hostname === "boards.greenhouse.io" || hostname === "job-boards.greenhouse.io") {
    const match = pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (match) {
      return { atsType: "greenhouse", companySlug: match[1], jobId: match[2] };
    }
    // Fallback: extract whatever is available
    const parts = pathname.split("/").filter(Boolean);
    return {
      atsType: "greenhouse",
      companySlug: parts[0] ?? "",
      jobId: parts[parts.indexOf("jobs") + 1] ?? "",
    };
  }

  // Lever
  // https://jobs.lever.co/{company}/{jobId}
  if (hostname === "jobs.lever.co") {
    const match = pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (match) {
      return { atsType: "lever", companySlug: match[1], jobId: match[2] };
    }
    const parts = pathname.split("/").filter(Boolean);
    return { atsType: "lever", companySlug: parts[0] ?? "", jobId: parts[1] ?? "" };
  }

  // Workable
  // https://apply.workable.com/{company}/j/{jobId}
  // https://{company}.workable.com/jobs/{jobId}
  if (hostname === "apply.workable.com" || hostname.endsWith(".workable.com")) {
    if (hostname === "apply.workable.com") {
      const match = pathname.match(/^\/([^/]+)\/j\/([^/]+)/);
      if (match) {
        return { atsType: "workable", companySlug: match[1], jobId: match[2] };
      }
    } else {
      const companySlug = hostname.replace(".workable.com", "");
      const match = pathname.match(/\/jobs\/([^/]+)/);
      return {
        atsType: "workable",
        companySlug,
        jobId: match?.[1] ?? "",
      };
    }
    const parts = pathname.split("/").filter(Boolean);
    return { atsType: "workable", companySlug: parts[0] ?? "", jobId: parts[parts.length - 1] ?? "" };
  }

  // SmartRecruiters
  // https://jobs.smartrecruiters.com/{company}/{jobId}
  if (hostname === "jobs.smartrecruiters.com") {
    const match = pathname.match(/^\/([^/]+)\/(\d+)/);
    if (match) {
      return { atsType: "smartrecruiters", companySlug: match[1], jobId: match[2] };
    }
    const parts = pathname.split("/").filter(Boolean);
    return { atsType: "smartrecruiters", companySlug: parts[0] ?? "", jobId: parts[1] ?? "" };
  }

  // Ashby
  // https://jobs.ashbyhq.com/{company}/{jobId}
  if (hostname === "jobs.ashbyhq.com" || hostname.endsWith(".ashbyhq.com")) {
    const match = pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (match) {
      return { atsType: "ashby", companySlug: match[1], jobId: match[2] };
    }
    const parts = pathname.split("/").filter(Boolean);
    return { atsType: "ashby", companySlug: parts[0] ?? "", jobId: parts[1] ?? "" };
  }

  // BambooHR
  // https://{company}.bamboohr.com/jobs/view.php?id={jobId}
  // https://{company}.bamboohr.com/careers/{jobId}
  if (hostname.endsWith(".bamboohr.com")) {
    const companySlug = hostname.replace(".bamboohr.com", "");
    const idFromQuery = parsed.searchParams.get("id") ?? "";
    if (idFromQuery) {
      return { atsType: "bamboohr", companySlug, jobId: idFromQuery };
    }
    const match = pathname.match(/\/careers\/(\d+)/);
    return {
      atsType: "bamboohr",
      companySlug,
      jobId: match?.[1] ?? "",
    };
  }

  // LinkedIn
  // https://www.linkedin.com/jobs/view/{jobId}
  if (hostname.includes("linkedin.com")) {
    const match = pathname.match(/\/jobs\/view\/(\d+)/);
    return { atsType: "linkedin", companySlug: "", jobId: match?.[1] ?? "" };
  }

  // Indeed
  // https://www.indeed.com/viewjob?jk={jobId}
  // https://www.indeed.com/jobs?vjk={jobId}
  if (hostname.includes("indeed.com")) {
    const jk = parsed.searchParams.get("jk") ?? parsed.searchParams.get("vjk") ?? "";
    return { atsType: "indeed", companySlug: "", jobId: jk };
  }

  // Naukri
  // https://www.naukri.com/job-listings-{slug}-{jobId}
  // https://www.naukri.com/job-listings/...?jobId={id}
  if (hostname.includes("naukri.com")) {
    const qJobId = parsed.searchParams.get("jobId");
    if (qJobId) return { atsType: "naukri", companySlug: "", jobId: qJobId };
    const match = pathname.match(/-(\d+)(?:\?|$|\/?$)/);
    return { atsType: "naukri", companySlug: "", jobId: match?.[1] ?? "" };
  }

  // Bayt
  // https://www.bayt.com/en/uae/jobs/{job-slug}-{jobId}/
  if (hostname.includes("bayt.com")) {
    const match = pathname.match(/-(\d+)\/?$/);
    return { atsType: "bayt", companySlug: "", jobId: match?.[1] ?? "" };
  }

  return null;
}
