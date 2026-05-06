import mongoose, { Schema, Document, Model } from "mongoose";

export type ReplyClassification = "positive" | "rejection" | "automated" | "neutral" | "interview_invite";

export interface IReply extends Document {
  userId: string;
  applicationId: mongoose.Types.ObjectId;

  // Email metadata
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;

  // AI classification
  classification: ReplyClassification;
  classificationConfidence: number; // 0-1
  classificationReason: string;
  isAutomatic: boolean; // true = automated/bot reply

  // Extracted data
  extractedInterviewDate?: string;
  extractedInterviewLink?: string;
  sentiment: "positive" | "negative" | "neutral";
  urgency: "high" | "medium" | "low";

  // User actions
  read: boolean;
  archived: boolean;
  userNote?: string;

  // Resend/email provider tracking
  emailId?: string;

  // Gmail-specific — prevents re-processing the same message
  gmailMessageId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    userId: { type: String, required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },

    fromEmail: { type: String, required: true },
    fromName: { type: String, default: "" },
    subject: { type: String, required: true },
    bodyText: { type: String, required: true },
    bodyHtml: String,
    receivedAt: { type: Date, required: true },

    classification: {
      type: String,
      enum: ["positive","rejection","automated","neutral","interview_invite"],
      required: true,
    },
    classificationConfidence: { type: Number, default: 0 },
    classificationReason: { type: String, default: "" },
    isAutomatic: { type: Boolean, default: false },

    extractedInterviewDate: String,
    extractedInterviewLink: String,
    sentiment: { type: String, enum: ["positive","negative","neutral"], default: "neutral" },
    urgency: { type: String, enum: ["high","medium","low"], default: "medium" },

    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    userNote: String,

    emailId: String,
    gmailMessageId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

ReplySchema.index({ userId: 1, classification: 1, receivedAt: -1 });

const Reply: Model<IReply> =
  mongoose.models.Reply ?? mongoose.model<IReply>("Reply", ReplySchema);

export default Reply;
