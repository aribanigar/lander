import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Signal from "@/lib/db/models/signal";
import SignalsClient from "./SignalsClient";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  const signals = await Signal.find({ userId, dismissed: false })
    .sort({ detectedAt: -1 })
    .limit(50)
    .lean();

  return <SignalsClient signals={JSON.parse(JSON.stringify(signals))} />;
}
