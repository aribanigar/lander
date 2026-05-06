import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  fullName: string;

  // Professional profile
  field: string;
  role: string;
  yearsExp: number;
  niche: string;
  level: "Junior" | "Associate" | "Mid-level" | "Senior" | "Lead / Principal" | "Director / VP" | "C-Suite";

  // Job preferences
  jobType: string[];
  targetRegions: string[];
  remotePreference: "Fully remote" | "Hybrid" | "On-site" | "No preference";

  // Salary
  salaryMin: number;
  salaryMax: number;
  currency: string;

  // Social
  linkedinUrl?: string;
  linkedinConnected: boolean;

  // Resume
  resumeFileUrl?: string;
  resumeFileName?: string;
  resumeBuildComplete: boolean;

  // Onboarding
  onboardingComplete: boolean;
  onboardingStep: number;

  // Stats cache (updated on each job run)
  totalApplied: number;
  totalReplied: number;
  totalInterviews: number;
  totalRejected: number;
  totalOffers: number;

  // Settings
  dailyApplyLimit: number;
  notifyOnApply: boolean;
  notifyOnPositiveReply: boolean;
  notifyOnRejection: boolean;
  emailNotifications: string; // email to send notifications to

  // Gmail integration — OAuth tokens stored here
  gmailConnected: boolean;
  gmailRefreshToken?: string;
  gmailEmail?: string;
  gmailLastScannedAt?: Date;
  gmailHistoryId?: string;   // Gmail API history ID for incremental sync

  // LinkedIn session (stored by browser worker after user logs in once)
  linkedinSessionCookies?: string;  // JSON-stringified cookie array
  linkedinSessionAt?: Date;

  // Platform credentials (AES-256-GCM encrypted JSON: {email, password})
  linkedinCreds?: string;
  indeedCreds?: string;
  naukriCreds?: string;
  baytCreds?: string;

  // Platform session cookies (AES-256-GCM encrypted JSON array, saved by worker after login)
  linkedinSession?: string;
  linkedinSessionUpdatedAt?: Date;
  indeedSession?: string;
  indeedSessionUpdatedAt?: Date;
  naukriSession?: string;
  naukriSessionUpdatedAt?: Date;
  baytSession?: string;
  baytSessionUpdatedAt?: Date;

  // Auto-pilot
  autopilotEnabled: boolean;
  autopilotLastRanAt?: Date;

  // Plan
  plan: "free" | "starter" | "pro" | "unlimited";

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    fullName: { type: String, default: "" },

    field: { type: String, default: "" },
    role: { type: String, default: "" },
    yearsExp: { type: Number, default: 0 },
    niche: { type: String, default: "" },
    level: { type: String, default: "Senior" },

    jobType: { type: [String], default: ["Full-time"] },
    targetRegions: { type: [String], default: [] },
    remotePreference: { type: String, default: "No preference" },

    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },

    linkedinUrl: { type: String, default: "" },
    linkedinConnected: { type: Boolean, default: false },

    resumeFileUrl: { type: String },
    resumeFileName: { type: String },
    resumeBuildComplete: { type: Boolean, default: false },

    onboardingComplete: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 },

    totalApplied: { type: Number, default: 0 },
    totalReplied: { type: Number, default: 0 },
    totalInterviews: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },
    totalOffers: { type: Number, default: 0 },

    dailyApplyLimit: { type: Number, default: 20 },
    notifyOnApply: { type: Boolean, default: true },
    notifyOnPositiveReply: { type: Boolean, default: true },
    notifyOnRejection: { type: Boolean, default: true },
    emailNotifications: { type: String, default: "" },

    gmailConnected: { type: Boolean, default: false },
    gmailRefreshToken: { type: String, select: false }, // excluded from normal queries
    gmailEmail: { type: String },
    gmailLastScannedAt: { type: Date },
    gmailHistoryId: { type: String },

    linkedinSessionCookies: { type: String, select: false },
    linkedinSessionAt: { type: Date },

    linkedinCreds:             { type: String, select: false },
    indeedCreds:               { type: String, select: false },
    naukriCreds:               { type: String, select: false },
    baytCreds:                 { type: String, select: false },

    linkedinSession:           { type: String, select: false },
    linkedinSessionUpdatedAt:  { type: Date },
    indeedSession:             { type: String, select: false },
    indeedSessionUpdatedAt:    { type: Date },
    naukriSession:             { type: String, select: false },
    naukriSessionUpdatedAt:    { type: Date },
    baytSession:               { type: String, select: false },
    baytSessionUpdatedAt:      { type: Date },

    autopilotEnabled:   { type: Boolean, default: false },
    autopilotLastRanAt: { type: Date },

    plan: { type: String, default: "free" },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
