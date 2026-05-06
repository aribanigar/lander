import mongoose, { Schema, Document, Model } from "mongoose";

export type SignalType =
  | "funding"          // Series A/B/C raise — company is growing
  | "headcount_growth" // LinkedIn headcount growing fast
  | "exec_hire"        // New C-suite or VP joined — building teams
  | "mass_hire"        // 10+ open roles in the same department
  | "new_office"       // New location opened — local hiring
  | "product_launch";  // New product/feature — need builders

export interface ISignal extends Document {
  userId: string;
  company: string;
  companyDomain?: string;
  companyLinkedIn?: string;

  signalType: SignalType;
  description: string;  // Human-readable e.g. "Raised $40M Series B — likely 30-50 new hires"
  strength: "strong" | "medium" | "weak";
  confidence: number;   // 0–100

  detectedAt: Date;
  actionTaken: boolean;
  dismissed: boolean;

  // Optional enrichment
  jobCount?: number;    // How many open roles this company has right now
  fundingAmount?: string;
  source?: string;      // "apollo" | "manual" | "scraped"

  createdAt: Date;
  updatedAt: Date;
}

const SignalSchema = new Schema<ISignal>(
  {
    userId:          { type: String, required: true, index: true },
    company:         { type: String, required: true },
    companyDomain:   String,
    companyLinkedIn: String,
    signalType:      {
      type: String,
      enum: ["funding","headcount_growth","exec_hire","mass_hire","new_office","product_launch"],
      required: true,
    },
    description:     { type: String, required: true },
    strength:        { type: String, enum: ["strong","medium","weak"], default: "medium" },
    confidence:      { type: Number, min: 0, max: 100, default: 70 },
    detectedAt:      { type: Date, default: Date.now },
    actionTaken:     { type: Boolean, default: false },
    dismissed:       { type: Boolean, default: false },
    jobCount:        Number,
    fundingAmount:   String,
    source:          String,
  },
  { timestamps: true }
);

SignalSchema.index({ userId: 1, dismissed: 1, detectedAt: -1 });

const Signal: Model<ISignal> =
  mongoose.models.Signal ?? mongoose.model<ISignal>("Signal", SignalSchema);

export default Signal;
