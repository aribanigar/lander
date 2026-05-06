import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterview extends Document {
  userId: string;
  applicationId: mongoose.Types.ObjectId;
  replyId?: mongoose.Types.ObjectId;

  // Job snapshot
  jobTitle: string;
  company: string;
  companyLogo?: string;

  // Interview details
  scheduledAt: Date;
  durationMinutes: number;
  type: "phone" | "video" | "in-person" | "panel" | "technical" | "hr";
  format: "one-on-one" | "panel" | "group" | "async";
  platform?: string; // "Zoom", "Google Meet", "Teams", etc.
  meetingLink?: string;
  location?: string; // for in-person

  // Preparation
  interviewerName?: string;
  interviewerRole?: string;
  notes?: string;
  prepNotes?: string;
  questionsToAsk?: string[];

  // Outcome
  status: "upcoming" | "completed" | "cancelled" | "rescheduled";
  outcome?: "positive" | "negative" | "pending" | "offer";
  feedback?: string;

  // Reminders
  reminderSent24h: boolean;
  reminderSent1h: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    userId: { type: String, required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    replyId: { type: Schema.Types.ObjectId, ref: "Reply" },

    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    companyLogo: String,

    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45 },
    type: { type: String, enum: ["phone","video","in-person","panel","technical","hr"], default: "video" },
    format: { type: String, enum: ["one-on-one","panel","group","async"], default: "one-on-one" },
    platform: String,
    meetingLink: String,
    location: String,

    interviewerName: String,
    interviewerRole: String,
    notes: String,
    prepNotes: String,
    questionsToAsk: [String],

    status: { type: String, enum: ["upcoming","completed","cancelled","rescheduled"], default: "upcoming" },
    outcome: { type: String, enum: ["positive","negative","pending","offer"] },
    feedback: String,

    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InterviewSchema.index({ userId: 1, scheduledAt: 1, status: 1 });

const Interview: Model<IInterview> =
  mongoose.models.Interview ??
  mongoose.model<IInterview>("Interview", InterviewSchema);

export default Interview;
