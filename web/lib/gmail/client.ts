/**
 * Gmail OAuth2 client — shared helper.
 * Requires env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL   (used to build redirect URI)
 */
import { google } from "googleapis";

export function getOAuth2Client() {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri
  );
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Build a Gmail client from a stored refresh token */
export function getGmailClient(refreshToken: string) {
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

/** Decode base64url Gmail message body */
export function decodeBody(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Extract plain-text body from a Gmail message */
export function extractPlainText(payload: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null } | null | undefined): string {
  if (!payload) return "";

  // Direct plain-text body
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  // Multipart — recurse through parts
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractPlainText(part as typeof payload);
      if (text) return text;
    }
  }

  return "";
}

/** Extract header value from Gmail message headers */
export function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}
