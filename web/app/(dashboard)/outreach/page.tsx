import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Outreach from "@/lib/db/models/outreach";
import FollowUp from "@/lib/db/models/followup";
import OutreachClient from "./OutreachClient";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  const [outreachItems, followUps] = await Promise.all([
    Outreach.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    FollowUp.find({ userId })
      .sort({ scheduledFor: 1 })
      .limit(30)
      .lean(),
  ]);

  return (
    <OutreachClient
      outreachItems={JSON.parse(JSON.stringify(outreachItems))}
      followUps={JSON.parse(JSON.stringify(followUps))}
    />
  );
}
