import mongoose, { Schema, Document, Model } from "mongoose";

export type ApplicationStatus =
  | "queued"       // scheduled but not yet sent
  | "applied"      // successfully submitted
  | "viewed"       // company opened the application
  | "replied"      // any reply received
  | "positive"     // recruiter interest / invitation to talk
  | "interview"    // interview booked
  | "offer"        // job offer received
  | "rejected"     // rejected
  | "withdrawn"    // user withdrew
  | "failed";      // application attempt failed

export interface IApplication extends Document {
  userId: string;
  jobId: mongoose.Types.ObjectId;

  // Quick-access job snapshot (so pipeline works without join)
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  latitude?: number;
  longitude?: number;
  jobUrl: string;
  applyUrl?: string;

  // ATS / apply method metadata
  atsType?: string | null;
  applyMethod?: string;        // 'greenhouse_api' | 'browser_queued' | 'greenhouse_failed' etc.
  externalApplicationId?: string;  // ID returned by the ATS on success

  salary?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  remote: boolean;

  status: ApplicationStatus;
  statusHistory: Array<{ status: ApplicationStatus; changedAt: Date; note?: string }>;

  // Resume used for this application
  tailoredResumeUrl?: string;
  tailoredResumeText?: string;
  coverLetter?: string;

  // ATS match score at time of apply
  atsScore?: number;
  keywordsMatched?: string[];

  // Reply tracking
  lastReplyAt?: Date;
  lastReplySubject?: string;
  lastReplyClassification?: "positive" | "rejection" | "automated" | "neutral";
  replyCount: number;

  // Interview
  interviewAt?: Date;
  interviewType?: "phone" | "video" | "in-person" | "panel";
  interviewNotes?: string;

  // Source tracking
  source?: string;

  // Error tracking
  failureReason?: string;

  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: { type: String, required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },

    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    companyLogo: String,
    location: { type: String, default: "" },
    country: { type: String, default: "" },
    latitude: Number,
    longitude: Number,
    jobUrl: { type: String, required: true },
    applyUrl: String,
    atsType: { type: String, default: null },
    applyMethod: String,
    externalApplicationId: String,
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
      period: { type: String, default: "yearly" },
    },
    remote: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["queued","applied","viewed","replied","positive","interview","offer","rejected","withdrawn","failed"],
      default: "queued",
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    tailoredResumeUrl: String,
    tailoredResumeText: String,
    coverLetter: String,

    atsScore: Number,
    keywordsMatched: [String],

    lastReplyAt: Date,
    lastReplySubject: String,
    lastReplyClassification: {
      type: String,
      enum: ["positive", "rejection", "automated", "neutral"],
    },
    replyCount: { type: Number, default: 0 },

    interviewAt: Date,
    interviewType: { type: String, enum: ["phone","video","in-person","panel"] },
    interviewNotes: String,

    source: String,
    failureReason: String,
    appliedAt: Date,
  },
  { timestamps: true }
);

ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ userId: 1, appliedAt: -1 });

const Application: Model<IApplication> =
  mongoose.models.Application ??
  mongoose.model<IApplication>("Application", ApplicationSchema);

export default Application;
