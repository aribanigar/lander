export interface NormalizedJob {
  externalId: string;
  source: string;
  url: string;
  applyUrl?: string;
  atsType?: string | null;
  atsCompanySlug?: string;
  atsJobId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  latitude?: number;
  longitude?: number;
  remote: boolean;
  description: string;
  salary?: { min: number; max: number; currency: string };
  jobType?: string;
  postedAt?: string;
  tags?: string[];
  fingerprint: string;
}
