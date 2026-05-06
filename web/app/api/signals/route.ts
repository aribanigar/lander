import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Signal from "@/lib/db/models/signal";

// GET — list signals for this user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const showDismissed = req.nextUrl.searchParams.get("dismissed") === "true";

  await connectDB();

  const signals = await Signal.find({
    userId,
    dismissed: showDismissed,
  })
    .sort({ detectedAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ signals });
}

// POST — manually log a signal
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();

  const signal = await Signal.create({ userId, ...body });
  return NextResponse.json({ signal });
}
