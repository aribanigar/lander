import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";
import Interview from "@/lib/db/models/interview";
import { format, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();

  const today = new Date();
  const [todayApps, todayInterviews] = await Promise.all([
    Application.find({
      userId,
      appliedAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
    })
      .sort({ appliedAt: -1 })
      .lean(),
    Interview.find({
      userId,
      scheduledAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
    })
      .sort({ scheduledAt: 1 })
      .lean(),
  ]);

  const TARGET = 20;
  const pct = Math.min(Math.round((todayApps.length / TARGET) * 100), 100);

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        {format(today, "EEEE, MMMM d")} · Daily target: {TARGET} applications
      </p>

      <div className="grid grid-cols-12 gap-3">
        {/* Progress */}
        <div className="col-span-8 card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl font-bold font-mono tracking-tight" style={{ color: "var(--ink)" }}>
              {todayApps.length}
              <span className="text-xl text-gray-300 font-normal">/{TARGET}</span>
            </div>
            <span
              className="text-2xs font-mono px-2 py-1 rounded-full"
              style={{ background: pct >= 100 ? "var(--lime)" : "rgba(24,25,26,0.06)", color: pct >= 100 ? "var(--lime-dark)" : "var(--ink-3)" }}
            >
              {pct}% of target
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: "rgba(24,25,26,0.08)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 100 ? "var(--lime)" : "var(--ink)" }}
            />
          </div>

          {todayApps.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No applications sent yet today</div>
              <div className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>Start your daily loop to hit your target</div>
              <Link
                href="/pipeline?action=apply"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--ink)", color: "var(--lime)" }}
              >
                Run today&apos;s loop
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
                Sent today
              </div>
              {todayApps.map((a) => (
                <div
                  key={a._id.toString()}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{a.company}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--ink-3)" }}>{a.jobTitle}</span>
                  </div>
                  <span className="text-2xs font-mono" style={{ color: "var(--ink-3)" }}>
                    {a.appliedAt ? format(new Date(a.appliedAt), "HH:mm") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's interviews + checklist */}
        <div className="col-span-4 space-y-3">
          <div className="card">
            <div className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--ink-3)" }}>
              Today&apos;s interviews
            </div>
            {todayInterviews.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>None scheduled today</div>
            ) : (
              <div className="space-y-2">
                {todayInterviews.map((iv) => (
                  <div key={iv._id.toString()} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{iv.company}</div>
                      <div className="text-xs" style={{ color: "var(--ink-3)" }}>{iv.jobTitle}</div>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--ink-2)" }}>
                      {format(new Date(iv.scheduledAt), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-off rounded-2xl p-4">
            <div className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--ink-3)" }}>
              Daily checklist
            </div>
            {[
              { label: `Apply to ${TARGET} jobs`, done: todayApps.length >= TARGET },
              { label: "Check replies inbox", done: false },
              { label: "Review pipeline status", done: false },
              { label: "Update resume if needed", done: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 mb-2 last:mb-0">
                <div
                  className="w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center"
                  style={{
                    borderColor: item.done ? "var(--lime-dark)" : "var(--border)",
                    background: item.done ? "var(--lime)" : "transparent",
                  }}
                >
                  {item.done && <span style={{ fontSize: 9, color: "var(--lime-dark)" }}>✓</span>}
                </div>
                <span
                  className="text-xs"
                  style={{
                    color: item.done ? "var(--ink-3)" : "var(--ink-2)",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
