import mongoose, { Schema, Model } from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment");
  await mongoose.connect(uri);
  connected = true;
  console.log("[db] Connected to MongoDB");
}

/* ── Minimal Application schema (worker only reads/writes a subset) ───────── */
export interface IApplication {
  _id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  applyUrl?: string;
  atsType?: string | null;
  atsCompanySlug?: string;
  atsJobId?: string;
  applyMethod?: string;
  externalApplicationId?: string;
  status: string;
  tailoredResumeText?: string;
  coverLetter?: string;
  source?: string;
  appliedAt?: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId:                { type: String, index: true },
    jobId:                 Schema.Types.ObjectId,
    jobTitle:              String,
    company:               String,
    jobUrl:                String,
    applyUrl:              String,
    atsType:               String,
    atsCompanySlug:        String,
    atsJobId:              String,
    applyMethod:           String,
    externalApplicationId: String,
    status:                { type: String, index: true },
    tailoredResumeText:    String,
    coverLetter:           String,
    source:                String,
    appliedAt:             Date,
  },
  { timestamps: true, strict: false }
);

export const Application: Model<IApplication> =
  (mongoose.models.Application as Model<IApplication>) ??
  mongoose.model<IApplication>("Application", ApplicationSchema);

/* ── Minimal User schema ──────────────────────────────────────────────────── */
export interface IUser {
  clerkId: string;
  fullName: string;
  email?: string;
  emailNotifications?: string;
  phone?: string;

  // Encrypted platform credentials
  linkedinCreds?: string;
  indeedCreds?:   string;
  naukriCreds?:   string;
  baytCreds?:     string;

  // Encrypted session cookies (saved by worker after successful login)
  linkedinSession?: string;
  linkedinSessionUpdatedAt?: Date;
  indeedSession?: string;
  indeedSessionUpdatedAt?: Date;
  naukriSession?: string;
  naukriSessionUpdatedAt?: Date;
  baytSession?: string;
  baytSessionUpdatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId:                  { type: String, index: true },
    fullName:                 String,
    email:                    String,
    emailNotifications:       String,
    phone:                    String,
    linkedinCreds:            String,
    indeedCreds:              String,
    naukriCreds:              String,
    baytCreds:                String,
    linkedinSession:          String,
    linkedinSessionUpdatedAt: Date,
    indeedSession:            String,
    indeedSessionUpdatedAt:   Date,
    naukriSession:            String,
    naukriSessionUpdatedAt:   Date,
    baytSession:              String,
    baytSessionUpdatedAt:     Date,
  },
  { strict: false }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);
