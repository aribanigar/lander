import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const [clerkUser, dbUser] = await Promise.all([
    currentUser(),
    User.findOne({ clerkId: userId })
      .select("fullName field role yearsExp niche salaryMin salaryMax currency remotePreference targetRegions linkedinUrl jobType level gmailConnected gmailEmail linkedinCreds indeedCreds naukriCreds baytCreds")
      .lean(),
  ]);

  const u = dbUser as Record<string, unknown> | null;

  return (
    <SettingsClient
      profile={JSON.parse(JSON.stringify(u ?? {}))}
      email={clerkUser?.emailAddresses[0]?.emailAddress ?? ""}
      gmailConnected={Boolean(u?.gmailConnected)}
      gmailEmail={(u?.gmailEmail as string) ?? ""}
      platformConnected={{
        linkedin: Boolean(u?.linkedinCreds),
        indeed:   Boolean(u?.indeedCreds),
        naukri:   Boolean(u?.naukriCreds),
        bayt:     Boolean(u?.baytCreds),
      }}
    />
  );
}
