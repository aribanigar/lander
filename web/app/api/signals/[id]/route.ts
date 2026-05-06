import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Signal from "@/lib/db/models/signal";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  await connectDB();

  const update: Record<string, unknown> = {};
  if (body.dismissed    !== undefined) update.dismissed    = body.dismissed;
  if (body.actionTaken  !== undefined) update.actionTaken  = body.actionTaken;

  const signal = await Signal.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!signal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ signal });
}
