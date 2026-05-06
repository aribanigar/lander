import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOutreach extends Document {
  userId: string;
  company: string;
  jobTitle: string;
  jobUrl?: string;

  // Contact details (found via Apollo or manually entered)
  contactName?: string;
  contactTitle?: string;
  contactLinkedIn?: string;
  contactEmail?: string;
  contactAvatarUrl?: string;

  // The drafted message
  message: string;
  platform: "linkedin" | "email" | "other";

  // Lifecycle
  status: "draft" | "sent" | "replied" | "ignored";
  sentAt?: Date;
  repliedAt?: Date;

  // Linked application (optional)
  applicationId?: mongoose.Types.ObjectId;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachSchema = new Schema<IOutreach>(
  {
    userId:           { type: String, required: true, index: true },
    company:          { type: String, required: true },
    jobTitle:         { type: String, required: true },
    jobUrl:           String,
    contactName:      String,
    contactTitle:     String,
    contactLinkedIn:  String,
    contactEmail:     String,
    contactAvatarUrl: String,
    message:          { type: String, required: true },
    platform:         { type: String, enum: ["linkedin","email","other"], default: "linkedin" },
    status:           { type: String, enum: ["draft","sent","replied","ignored"], default: "draft", index: true },
    sentAt:           Date,
    repliedAt:        Date,
    applicationId:    { type: Schema.Types.ObjectId, ref: "Application" },
    notes:            String,
  },
  { timestamps: true }
);

OutreachSchema.index({ userId: 1, status: 1 });
OutreachSchema.index({ userId: 1, createdAt: -1 });

const Outreach: Model<IOutreach> =
  mongoose.models.Outreach ?? mongoose.model<IOutreach>("Outreach", OutreachSchema);

export default Outreach;
