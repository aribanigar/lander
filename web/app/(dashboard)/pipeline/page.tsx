import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import PipelineClient from "./PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  const apps = await Application.find({ userId })
    .sort({ appliedAt: -1 })
    .lean();

  return <PipelineClient applications={JSON.parse(JSON.stringify(apps))} />;
}
