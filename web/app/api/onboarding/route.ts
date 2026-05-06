import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Cookie name that the middleware uses as an immediate fallback while the
// Clerk JWT's publicMetadata propagates (~60 s token TTL).
const ONBOARDING_COOKIE = "__landed_ob";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    fullName, field, role, yearsExp, level, niche,
    jobType, targetCountries, remotePreference,
    currencyCode, currencySymbol, salaryMin, salaryMax,
    linkedinUrl, resumeChoice,
  } = body;

  // Derive flat string array for targetRegions from the rich country objects
  const targetRegions: string[] = Array.isArray(targetCountries)
    ? targetCountries.map((c: { name: string }) => c.name)
    : [];

  // Resolve ISO 4217 code — prefer explicit currencyCode, fall back to symbol mapping
  const resolvedCurrency: string =
    currencyCode ||
    (currencySymbol === "£" ? "GBP" : currencySymbol === "€" ? "EUR" : "USD");

  const clerk = await clerkClient();

  // Get email from Clerk so the upsert always has it
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  await connectDB();

  // 1. Persist to MongoDB — this is the source of truth.
  await User.findOneAndUpdate(
    { clerkId: userId },
    {
      $set: {
        clerkId: userId,
        email,
        fullName,
        field,
        role,
        yearsExp: Number(yearsExp) || 0,
        level,
        niche,
        jobType: jobType ? [jobType] : ["Full-time"],
        targetRegions,
        remotePreference,
        currency: resolvedCurrency,
        salaryMin: Number(String(salaryMin ?? "").replace(/[^0-9]/g, "")) || 0,
        salaryMax: Number(String(salaryMax ?? "").replace(/[^0-9]/g, "")) || 0,
        linkedinUrl,
        onboardingComplete: true,
        dailyApplyLimit: 20,
      },
    },
    { upsert: true, new: true }
  );

  // 2. Best-effort: sync to Clerk JWT publicMetadata.
  // Wrapped in try-catch so a Clerk API hiccup never blocks the response.
  // The __landed_ob cookie (step 3) is the immediate fallback anyway.
  try {
    await clerk.users.updateUser(userId, {
      publicMetadata: { onboardingComplete: true },
    });
  } catch (clerkErr) {
    console.error("[onboarding] Clerk metadata update failed (non-fatal):", clerkErr);
  }

  // 3. Set a long-lived cookie immediately so the middleware can unblock the
  // user before Clerk's JWT propagates the updated publicMetadata (~60 s delay).
  const response = NextResponse.json({ success: true });
  response.cookies.set(ONBOARDING_COOKIE, "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
  });
  return response;
}
