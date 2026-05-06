/**
 * POST /api/credentials — save encrypted platform credentials for the current user
 * GET  /api/credentials — return which platforms have credentials saved (no secrets)
 * DELETE /api/credentials?platform=linkedin — remove credentials for a platform
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";
import { encryptJSON } from "@/lib/encrypt";

export const dynamic = "force-dynamic";

type Platform = "linkedin" | "indeed" | "naukri" | "bayt";

const PLATFORMS: Platform[] = ["linkedin", "indeed", "naukri", "bayt"];

const CREDS_FIELD: Record<Platform, string> = {
  linkedin: "linkedinCreds",
  indeed:   "indeedCreds",
  naukri:   "naukriCreds",
  bayt:     "baytCreds",
};

// ── GET — which platforms are connected ─────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ clerkId: userId }).select(
    PLATFORMS.map((p) => CREDS_FIELD[p]).join(" ")
  );

  const connected: Record<string, boolean> = {};
  for (const p of PLATFORMS) {
    const field = CREDS_FIELD[p] as keyof typeof user;
    connected[p] = Boolean(user?.[field]);
  }

  return NextResponse.json({ connected });
}

// ── POST — save encrypted credentials ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.platform || !body.email || !body.password) {
    return NextResponse.json({ error: "platform, email and password are required" }, { status: 400 });
  }

  const platform = body.platform as Platform;
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  await connectDB();

  const encrypted = encryptJSON({ email: body.email, password: body.password });

  await User.findOneAndUpdate(
    { clerkId: userId },
    { $set: { [CREDS_FIELD[platform]]: encrypted } }
  );

  return NextResponse.json({ ok: true, platform });
}

// ── DELETE — remove credentials ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = new URL(req.url).searchParams.get("platform") as Platform | null;
  if (!platform || !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  await connectDB();

  await User.findOneAndUpdate(
    { clerkId: userId },
    { $unset: { [CREDS_FIELD[platform]]: 1 } }
  );

  return NextResponse.json({ ok: true, platform });
}
