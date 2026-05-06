import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Resume from "@/lib/db/models/resume";
import ResumeClient from "./ResumeClient";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 }).lean();

  return <ResumeClient resumes={JSON.parse(JSON.stringify(resumes))} />;
}
