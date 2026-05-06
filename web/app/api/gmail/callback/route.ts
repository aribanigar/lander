/**
 * GET /api/gmail/callback
 * Google redirects here after user grants Gmail access.
 * Exchanges auth code for tokens, saves refresh_token to User.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import { getOAuth2Client, getGmailClient } from "@/lib/gmail/client";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const code   = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state"); // Clerk userId passed via state

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  }

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/settings?gmail=no_refresh_token`);
    }

    // Get the Gmail address the user connected
    client.setCredentials(tokens);
    const gmail      = getGmailClient(tokens.refresh_token);
    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const gmailEmail = profileRes.data.emailAddress ?? "";

    await connectDB();
    await User.updateOne(
      { clerkId: userId },
      {
        $set: {
          gmailConnected:    true,
          gmailRefreshToken: tokens.refresh_token,
          gmailEmail,
        },
      }
    );

    return NextResponse.redirect(`${appUrl}/settings?gmail=connected`);
  } catch (err) {
    console.error("[gmail/callback]", err);
    return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  }
}
