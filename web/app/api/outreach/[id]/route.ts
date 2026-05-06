import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Outreach from "@/lib/db/models/outreach";

// PATCH — update status or message
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
  if (body.status)  update.status  = body.status;
  if (body.message) update.message = body.message;
  if (body.notes)   update.notes   = body.notes;
  if (body.contactEmail)    update.contactEmail    = body.contactEmail;
  if (body.contactLinkedIn) update.contactLinkedIn = body.contactLinkedIn;
  if (body.contactName)     update.contactName     = body.contactName;
  if (body.contactTitle)    update.contactTitle    = body.contactTitle;

  if (body.status === "sent")    update.sentAt    = new Date();
  if (body.status === "replied") update.repliedAt = new Date();

  const outreach = await Outreach.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!outreach) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ outreach });
}

// DELETE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  await Outreach.findOneAndDelete({ _id: id, userId });
  return NextResponse.json({ success: true });
}
