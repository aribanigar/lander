import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FollowUp from "@/lib/db/models/followup";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// PATCH — update status, or send via Resend
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await connectDB();

  const followUp = await FollowUp.findOne({ _id: id, userId });
  if (!followUp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If sending via email
  if (body.action === "send_email" && followUp.contactEmail) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "notifications@landed.app",
      to:   followUp.contactEmail,
      subject: followUp.draftSubject,
      text:    followUp.draftMessage,
    });

    followUp.status  = "sent";
    followUp.sentAt  = new Date();
    await followUp.save();
    return NextResponse.json({ success: true, followUp });
  }

  // Otherwise just update fields
  if (body.status)       followUp.status       = body.status;
  if (body.draftMessage) followUp.draftMessage = body.draftMessage;
  if (body.draftSubject) followUp.draftSubject = body.draftSubject;
  if (body.contactEmail) followUp.contactEmail = body.contactEmail;

  if (body.status === "sent")    followUp.sentAt    = new Date();
  if (body.status === "replied") followUp.repliedAt = new Date();

  await followUp.save();
  return NextResponse.json({ followUp });
}
