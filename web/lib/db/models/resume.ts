import mongoose, { Schema, Document, Model } from "mongoose";

export interface ResumeSection {
  type: "summary" | "experience" | "education" | "skills" | "certifications" | "projects" | "awards";
  content: string; // markdown / plain text
  order: number;
}

export interface IResume extends Document {
  userId: string;

  // Which application this resume was tailored for (null = base resume)
  applicationId?: mongoose.Types.ObjectId;
  jobTitle?: string;
  company?: string;

  // Resume content
  sections: ResumeSection[];
  fullText: string; // joined plain text for ATS analysis

  // Keywords injected for this job
  keywordsInjected: string[];
  atsScore: number; // estimated ATS pass score 0-100

  // File
  fileUrl?: string;
  fileName?: string;

  // Type
  isMaster: boolean; // master resume vs tailored copy
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

const ResumeSectionSchema = new Schema({
  type: { type: String, required: true },
  content: { type: String, default: "" },
  order: { type: Number, default: 0 },
});

const ResumeSchema = new Schema<IResume>(
  {
    userId: { type: String, required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    jobTitle: String,
    company: String,

    sections: [ResumeSectionSchema],
    fullText: { type: String, default: "" },

    keywordsInjected: { type: [String], default: [] },
    atsScore: { type: Number, default: 0 },

    fileUrl: String,
    fileName: String,

    isMaster: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

ResumeSchema.index({ userId: 1, isMaster: 1 });

const Resume: Model<IResume> =
  mongoose.models.Resume ?? mongoose.model<IResume>("Resume", ResumeSchema);

export default Resume;
