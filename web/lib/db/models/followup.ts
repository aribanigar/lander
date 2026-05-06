import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFollowUp extends Document {
  userId: string;
  applicationId: mongoose.Types.ObjectId;

  // Snapshot for display
  company: string;
  jobTitle: string;
  contactEmail?: string;

  // Sequence
  dayNumber: 3 | 7 | 14;
  scheduledFor: Date;

  // AI-drafted message
  draftSubject: string;
  draftMessage: string;

  // Lifecycle
  status: "pending" | "sent" | "skipped" | "replied";
  sentAt?: Date;
  repliedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    userId:         { type: String, required: true, index: true },
    applicationId:  { type: Schema.Types.ObjectId, ref: "Application", required: true },
    company:        { type: String, required: true },
    jobTitle:       { type: String, required: true },
    contactEmail:   String,
    dayNumber:      { type: Number, enum: [3, 7, 14], required: true },
    scheduledFor:   { type: Date, required: true },
    draftSubject:   { type: String, default: "" },
    draftMessage:   { type: String, default: "" },
    status:         { type: String, enum: ["pending","sent","skipped","replied"], default: "pending", index: true },
    sentAt:         Date,
    repliedAt:      Date,
  },
  { timestamps: true }
);

FollowUpSchema.index({ userId: 1, status: 1, scheduledFor: 1 });

const FollowUp: Model<IFollowUp> =
  mongoose.models.FollowUp ?? mongoose.model<IFollowUp>("FollowUp", FollowUpSchema);

export default FollowUp;
