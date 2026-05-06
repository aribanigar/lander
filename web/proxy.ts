import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/webhook(.*)",
  "/api/email/webhook(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) return NextResponse.next();

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check JWT claims first; fall back to the cookie set by /api/onboarding
  // because Clerk's JWT takes up to ~60 s to propagate publicMetadata updates.
  // Clerk stores publicMetadata at sessionClaims.metadata in the default JWT template.
  const meta = (sessionClaims?.metadata ?? sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const jwtComplete = !!meta?.onboardingComplete;
  const cookieComplete = req.cookies.get("__landed_ob")?.value === "1";
  const onboardingComplete = jwtComplete || cookieComplete;

  // Never redirect API routes — they handle their own auth
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  if (!onboardingComplete && !isOnboardingRoute(req) && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (onboardingComplete && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)","/(api|trpc)(.*)"],
};
