/**
 * Shared utility — schedules the 3-email follow-up sequence for an application.
 * Called from both /api/followup (POST) and the apply engine directly.
 * DB must already be connected before calling.
 */
import FollowUp from "@/lib/db/models/followup";
import { generateFollowUp } from "@/lib/ai/claude";

interface AppData {
  _id: string;
  company: string;
  jobTitle: string;
  appliedAt: Date;
}

interface UserData {
  fullName?: string;
  niche?: string;
  field?: string;
}

export async function scheduleFollowUps(
  userId: string,
  app: AppData,
  user: UserData
): Promise<void> {
  // Skip if follow-ups already exist for this application
  const existing = await FollowUp.countDocuments({ userId, applicationId: app._id });
  if (existing > 0) return;

  const appliedAt    = new Date(app.appliedAt);
  const senderName   = user.fullName ?? "Candidate";
  const senderNiche  = user.niche ?? user.field ?? "professional";
  const { company, jobTitle } = app;

  const scheduleDate = (days: number) => {
    const d = new Date(appliedAt);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Generate all 3 drafts in parallel
  const [day3, day7, day14] = await Promise.all([
    generateFollowUp({ senderName, senderNiche, company, jobTitle, dayNumber: 3, appliedAt: appliedAt.toDateString() }),
    generateFollowUp({ senderName, senderNiche, company, jobTitle, dayNumber: 7, appliedAt: appliedAt.toDateString() }),
    generateFollowUp({ senderName, senderNiche, company, jobTitle, dayNumber: 14, appliedAt: appliedAt.toDateString() }),
  ]);

  await FollowUp.insertMany([
    {
      userId, applicationId: app._id,
      company, jobTitle,
      dayNumber: 3, scheduledFor: scheduleDate(3),
      draftSubject: day3.subject, draftMessage: day3.body,
      status: "pending",
    },
    {
      userId, applicationId: app._id,
      company, jobTitle,
      dayNumber: 7, scheduledFor: scheduleDate(7),
      draftSubject: day7.subject, draftMessage: day7.body,
      status: "pending",
    },
    {
      userId, applicationId: app._id,
      company, jobTitle,
      dayNumber: 14, scheduledFor: scheduleDate(14),
      draftSubject: day14.subject, draftMessage: day14.body,
      status: "pending",
    },
  ]);
}
