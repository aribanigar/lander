import type { Page } from "playwright";

export interface ApplyParams {
  page:          Page;
  applyUrl:      string;
  companySlug:   string;
  jobId:         string;
  fullName:      string;
  firstName:     string;
  lastName:      string;
  email:         string;
  phone?:        string;
  resumeText:    string;
  resumePdfPath: string;    // temp PDF file path — delete after upload
  coverLetter?:  string;
}

export interface ApplyResult {
  success:     boolean;
  externalId?: string;
  error?:      string;
}

/** Random delay to mimic human typing pauses */
export function delay(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 300);
  return new Promise((r) => setTimeout(r, ms + jitter));
}
