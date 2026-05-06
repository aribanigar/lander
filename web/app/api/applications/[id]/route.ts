import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import Interview from "@/lib/db/models/interview";
import User from "@/lib/db/models/user";
import { sendInterviewNotification } from "@/lib/email/resend";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, note, interviewAt, interviewType, meetingLink } = body;

  await connectDB();

  const app = await Application.findOne({ _id: id, userId });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prev = app.status;
  if (status) {
    app.status = status;
    app.statusHistory.push({ status, changedAt: new Date(), note });
  }
  await app.save();

  // If transitioning to interview, create Interview record + send email
  if (status === "interview" && prev !== "interview" && interviewAt) {
    const interview = await Interview.create({
      userId,
      applicationId: app._id,
      jobTitle: app.jobTitle,
      company: app.company,
      scheduledAt: new Date(interviewAt),
      type: interviewType ?? "video",
      meetingLink,
      status: "upcoming",
    });

    // Send notification
    const user = await User.findOne({ clerkId: userId }).lean();
    if (user?.notifyOnPositiveReply && user.emailNotifications) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await sendInterviewNotification({
        to: user.emailNotifications,
        userName: user.fullName,
        jobTitle: app.jobTitle,
        company: app.company,
        scheduledAt: new Date(interviewAt),
        meetingLink,
        dashboardUrl: appUrl,
      }).catch(() => null);
    }

    return NextResponse.json({ application: app, interview });
  }

  return NextResponse.json({ application: app });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Application.findOneAndDelete({ _id: id, userId });
  return NextResponse.json({ success: true });
}
