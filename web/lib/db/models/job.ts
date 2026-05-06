import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
  // Source
  source: "adzuna" | "jsearch" | "remotive" | "remoteok" | "jobicy" | "arbeitnow" | "himalayas" | "linkedin" | "indeed" | "glassdoor" | "loopcv" | "other";
  externalId: string;
  url: string;
  applyUrl?: string;           // direct apply URL (may differ from listing URL)

  // ATS detection — enables direct programmatic apply
  atsType?: string | null;     // 'greenhouse' | 'lever' | 'workable' | 'smartrecruiters' | 'ashby' | 'bamboohr' | null
  atsCompanySlug?: string;
  atsJobId?: string;
  atsApplyResult?: string;     // 'success' | 'failed' | 'not_supported'

  // Job details
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  latitude?: number;
  longitude?: number;
  salary?: {
    min: number;
    max: number;
    currency: string;
    period: "yearly" | "monthly" | "hourly";
  };
  jobType: string;
  level: string;
  remote: boolean;

  // Content
  description: string;
  extractedKeywords: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  tags?: string[];
  atsScore?: number; // 0-100 match score against user profile

  // Lifecycle
  postedAt?: Date;
  expiresAt?: Date;
  discoveredAt: Date;

  // Which user's search found this
  userId: string;

  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    source: { type: String, required: true },
    externalId: { type: String, required: true },
    url: { type: String, required: true },
    applyUrl: String,
    atsType: { type: String, default: null },
    atsCompanySlug: String,
    atsJobId: String,
    atsApplyResult: String,

    title: { type: String, required: true },
    company: { type: String, required: true },
    companyLogo: { type: String },
    location: { type: String, default: "" },
    country: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
      period: { type: String, default: "yearly" },
    },
    jobType: { type: String, default: "Full-time" },
    level: { type: String, default: "Senior" },
    remote: { type: Boolean, default: false },

    description: { type: String, default: "" },
    extractedKeywords: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    niceToHaveSkills: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    atsScore: { type: Number },

    postedAt: { type: Date },
    expiresAt: { type: Date },
    discoveredAt: { type: Date, default: Date.now },

    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Prevent duplicate jobs per user
JobSchema.index({ userId: 1, externalId: 1, source: 1 }, { unique: true });

const Job: Model<IJob> =
  mongoose.models.Job ?? mongoose.model<IJob>("Job", JobSchema);

export default Job;
