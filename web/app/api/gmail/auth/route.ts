/**
 * GET /api/gmail/auth
 * Redirects the user to Google OAuth consent screen.
 * After consent, Google redirects to /api/gmail/callback.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuth2Client, GMAIL_SCOPES } from "@/lib/gmail/client";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({
      error: "Gmail integration not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local"
    }, { status: 503 });
  }

  const client = getOAuth2Client();
  const url    = client.generateAuthUrl({
    access_type: "offline",      // get refresh_token
    prompt:      "consent",      // always show consent so we always get refresh_token
    scope:       GMAIL_SCOPES,
    state:       userId,         // pass Clerk userId through OAuth state
  });

  return NextResponse.redirect(url);
}
