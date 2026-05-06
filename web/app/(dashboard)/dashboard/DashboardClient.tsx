"use client";

import { format } from "date-fns";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

interface Props {
  user: { name: string; field: string; yearsExp: string; niche: string };
  stats: {
    totalApplied: number; totalViewed: number; totalReplied: number;
    totalInterview: number; totalRejected: number; replyRate: number; avgAts: number | null;
  };
  recentApps: Array<{
    _id: string; company: string; jobTitle: string; status: string;
    appliedAt: string; atsScore?: number; location?: string;
  }>;
  upcomingInterviews: Array<{
    _id: string; company: string; jobTitle: string; scheduledAt: string; type: string;
  }>;
  dailyBars: number[];
}

const STATUS_BADGE: Record<string, string> = {
  applied:   "badge-muted",
  viewed:    "badge-blue",
  replied:   "badge-green",
  interview: "badge-green",
  rejected:  "badge-red",
  offer:     "badge-green",
};

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied", viewed: "Viewed", replied: "Replied",
  interview: "Interview", rejected: "Rejected", offer: "Offer",
};

/* Tiny bar chart — last 7 days' applications */
function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-10 mt-3">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{
            height: `${Math.round((v / max) * 100)}%`,
            minHeight: 2,
            background: i === data.length - 1 ? "var(--lime)" : "rgba(24,25,26,0.1)",
          }}
        />
      ))}
    </div>
  );
}

export default function DashboardClient({ user, stats, recentApps, upcomingInterviews, dailyBars }: Props) {
  const today = new Date();
  const isEmpty = stats.totalApplied === 0;

  return (
    <div className="grid grid-cols-12 gap-3">

      {/* ── PROFILE CARD (lime) · col 1–5 ── */}
      <div className="col-span-5 rounded-card p-5" style={{ background: "var(--lime)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--ink)", color: "var(--lime)" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--lime-dark)" }}>{user.name}</div>
              <div className="text-xs" style={{ color: "var(--lime-dark)", opacity: 0.7 }}>
                {user.field || "Senior Professional"}{user.yearsExp ? ` · ${user.yearsExp} yrs` : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-2xl font-bold leading-tight tracking-tight" style={{ color: "var(--ink)" }}>
            Landed<br /><span className="font-light">Campaign</span>
          </div>
          {user.niche && (
            <div className="mt-1 text-xs" style={{ color: "var(--lime-dark)" }}>
              {user.niche.length > 60 ? user.niche.slice(0, 60) + "…" : user.niche}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: "var(--lime-dark)" }}>Campaign progress</span>
            <span className="text-xs font-mono" style={{ color: "var(--lime-dark)" }}>
              {stats.totalApplied > 0 ? Math.min(Math.round((stats.totalReplied / stats.totalApplied) * 100), 99) : 0}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(26,28,24,0.15)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${stats.totalApplied > 0 ? Math.min(Math.round((stats.totalReplied / stats.totalApplied) * 100), 99) : 0}%`,
                background: "var(--ink)",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href="/pipeline"
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
            style={{ background: "rgba(26,28,24,0.12)", color: "var(--lime-dark)" }}
          >
            View pipeline
          </Link>
          <Link
            href="/pipeline?action=apply"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ink)" }}
          >
            <ArrowRight size={14} color="#cce832" />
          </Link>
        </div>
      </div>

      {/* ── CALENDAR / INTERVIEWS · col 6–12 ── */}
      <div className="col-span-7 card">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold leading-tight tracking-tight">
            Upcoming<br />Interviews
          </div>
          <span className="text-xs px-3 py-1.5 rounded-lg border" style={{ color: "var(--ink-2)", borderColor: "var(--border)", background: "var(--card-off)" }}>
            {format(today, "MMMM yyyy")}
          </span>
        </div>

        {upcomingInterviews.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
            <div className="text-sm" style={{ color: "var(--ink-3)" }}>No interviews scheduled yet</div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
              Keep applying — they&apos;ll show up here as companies reply
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {upcomingInterviews.map((iv) => (
              <div
                key={iv._id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--lime)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {iv.company} — {iv.jobTitle}
                  </span>
                </div>
                <span className="text-2xs font-mono" style={{ color: "var(--ink-3)" }}>
                  {format(new Date(iv.scheduledAt), "EEE d · HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── APPLICATION PIPELINE · col 1–8 ── */}
      <div className="col-span-8 card">
        <div className="flex items-center justify-between mb-5">
          <div className="text-lg font-semibold leading-tight tracking-tight">
            Application<br />Pipeline
          </div>
          <Link
            href="/pipeline?action=apply"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "var(--ink)", color: "var(--lime)" }}
          >
            <Plus size={12} />
            Apply now
          </Link>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No applications yet</div>
            <div className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
              Set up your first job loop to start applying in bulk
            </div>
            <Link href="/pipeline?action=apply" className="btn-primary text-xs px-4 py-2">
              Start applying
            </Link>
          </div>
        ) : (
          <div>
            {recentApps.map((app) => (
              <div
                key={app._id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${STATUS_BADGE[app.status] || "badge-muted"}`}>
                    {STATUS_LABEL[app.status] || app.status}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {app.company} — {app.jobTitle}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {app.atsScore && (
                    <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                      ATS {app.atsScore}
                    </span>
                  )}
                  <span className="text-2xs font-mono" style={{ color: "var(--ink-3)" }}>
                    {format(new Date(app.appliedAt), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-end">
              <Link href="/pipeline" className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                View all →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── DATE CARD · col 9–12 ── */}
      <div className="col-span-4 card-off flex flex-col justify-between">
        <div>
          <div className="text-5xl font-bold font-mono leading-none tracking-tight" style={{ color: "var(--ink)" }}>
            {format(today, "d")}
          </div>
          <div className="text-base font-medium mt-1" style={{ color: "var(--ink-2)" }}>
            {format(today, "EEEE")}<br />{format(today, "MMMM")}
          </div>
        </div>
        <div className="divider" />
        <div>
          <div className="text-2xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
            Today&apos;s target
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--lime)" }} />
            <span className="text-sm" style={{ color: "var(--ink)" }}>20 applications</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--ink-3)" }} />
            <span className="text-sm" style={{ color: "var(--ink-2)" }}>2 follow-ups</span>
          </div>
        </div>
      </div>

      {/* ── REPLY RATE (dark) · col 1–4 ── */}
      <div className="col-span-4 rounded-card p-5" style={{ background: "var(--dark)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Reply rate</span>
        </div>
        <div className="mt-3">
          <div className="text-4xl font-bold font-mono leading-none tracking-tight text-white">
            {stats.replyRate > 0 ? `+${stats.replyRate}%` : "—"}
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            {stats.totalApplied > 0
              ? `${stats.totalReplied} replies from ${stats.totalApplied} applications`
              : "Start applying to see your rate"}
          </div>
        </div>
        <MiniChart data={dailyBars} />
      </div>

      {/* ── ATS SCORE · col 5–8 ── */}
      <div className="col-span-4 card-off">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(24,25,26,0.06)" }}
          >
            <span className="text-xs font-mono font-medium" style={{ color: "var(--ink-3)" }}>ATS</span>
          </div>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            ATS score<br />avg this week
          </span>
        </div>
        <div className="text-4xl font-bold font-mono leading-none tracking-tight" style={{ color: "var(--ink)" }}>
          {stats.avgAts ?? "—"}
        </div>
        {stats.avgAts && (
          <>
            <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>/ 100 optimised</div>
            <div className="mt-3.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(24,25,26,0.08)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${stats.avgAts}%`, background: "var(--lime)" }}
              />
            </div>
          </>
        )}
        {!stats.avgAts && (
          <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            Score appears once applications are sent
          </div>
        )}
      </div>

      {/* ── STATS SUMMARY · col 9–12 ── */}
      <div className="col-span-4 card">
        <div className="text-2xs uppercase tracking-widest font-medium mb-4" style={{ color: "var(--ink-3)" }}>
          Pipeline summary
        </div>
        <div className="space-y-3">
          {[
            { label: "Applied",    value: stats.totalApplied,   color: "var(--ink)" },
            { label: "Viewed",     value: stats.totalViewed,    color: "#3c78dc" },
            { label: "Replied",    value: stats.totalReplied,   color: "#64be50" },
            { label: "Interview",  value: stats.totalInterview, color: "var(--lime-dark)" },
            { label: "Rejected",   value: stats.totalRejected,  color: "#dc4646" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>{row.label}</span>
              <span className="text-sm font-bold font-mono" style={{ color: row.color }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
