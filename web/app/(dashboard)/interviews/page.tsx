import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Interview from "@/lib/db/models/interview";
import { isAfter, startOfDay } from "date-fns";
import InterviewsClient from "./InterviewsClient";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const interviews = await Interview.find({ userId }).sort({ scheduledAt: 1 }).lean();

  return <InterviewsClient interviews={JSON.parse(JSON.stringify(interviews))} />;
}
