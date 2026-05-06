/**
 * Queue management — claims queued applications atomically so multiple
 * worker instances never double-process the same application.
 */
import { Application, User, IApplication, IUser } from "./db";

const BATCH_SIZE = 2; // max concurrent browser sessions

export interface QueuedItem {
  application: IApplication;
  user: IUser;
}

/**
 * Atomically claim a batch of queued applications.
 * Sets status → "processing" to lock them from other workers.
 */
export async function claimBatch(): Promise<QueuedItem[]> {
  // Find queued applications
  const apps = await Application.find({ applyMethod: "browser_queued", status: "queued" })
    .sort({ appliedAt: 1 })
    .limit(BATCH_SIZE)
    .lean();

  if (apps.length === 0) return [];

  const ids = apps.map((a) => a._id);

  // Lock them
  await Application.updateMany({ _id: { $in: ids } }, { $set: { status: "processing" } });

  // Enrich with user data
  const items: QueuedItem[] = [];
  for (const app of apps) {
    const user = await User.findOne({ clerkId: app.userId }).lean();
    if (!user) continue;
    items.push({ application: app as IApplication, user: user as IUser });
  }

  return items;
}

export async function markApplied(applicationId: string, externalId?: string): Promise<void> {
  await Application.updateOne(
    { _id: applicationId },
    {
      $set: {
        status:                "applied",
        applyMethod:           "browser_auto",
        externalApplicationId: externalId,
        appliedAt:             new Date(),
      },
      $push: {
        statusHistory: { status: "applied", changedAt: new Date() },
      },
    }
  );
}

export async function markFailed(applicationId: string, reason: string): Promise<void> {
  await Application.updateOne(
    { _id: applicationId },
    {
      $set: { status: "failed", failureReason: reason },
      $push: { statusHistory: { status: "failed", changedAt: new Date() } },
    }
  );
}

export async function releaseBack(applicationId: string): Promise<void> {
  // Return to queue if browser crashed before completing
  await Application.updateOne(
    { _id: applicationId },
    { $set: { status: "queued" } }
  );
}
