import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReferralsClient from "./ReferralsClient";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <ReferralsClient />;
}
