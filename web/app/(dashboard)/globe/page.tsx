import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import GlobeClient from "./GlobeClient";

export const dynamic = "force-dynamic";

export default async function GlobePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  // Get applications with geo data
  const apps = await Application.find({
    userId,
    latitude: { $exists: true },
    longitude: { $exists: true },
  })
    .select("company jobTitle status latitude longitude location country appliedAt")
    .lean();

  return <GlobeClient applications={JSON.parse(JSON.stringify(apps))} />;
}
