import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import IntelligenceClient from "./IntelligenceClient";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <IntelligenceClient />;
}
