"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, ExternalLink, RefreshCw, Ghost, Loader2 } from "lucide-react";

interface Application {
  _id: string; company: string; jobTitle: string; status: string;
  appliedAt: string; atsScore?: number; location?: string;
  jobUrl?: string; salary?: string; source?: string;
  applyMethod?: string; atsType?: string | null;
  externalApplicationId?: string;
}

interface GhostResult {
  score: number;
  label: "likely_real" | "uncertain" | "likely_ghost";
  reasons: string[];
  recommendation: string;
}

const STATUSES = ["all", "applied", "viewed", "replied", "interview", "rejected", "offer"];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  applied:   { bg: "rgba(24,25,26,0.06)",     color: "var(--ink-2)",     label: "Applied" },
  viewed:    { bg: "rgba(60,120,220,0.1)",    color: "#1a4a9e",          label: "Viewed" },
  replied:   { bg: "rgba(100,190,80,0.12)",   color: "#2d6b1a",          label: "Replied" },
  interview: { bg: "rgba(200,224,50,0.18)",   color: "var(--lime-dark)", label: "Interview" },
  rejected:  { bg: "rgba(220,70,70,0.1)",     color: "#8b1a1a",          label: "Rejected" },
  offer:     { bg: "rgba(100,190,80,0.18)",   color: "#1a5c0a",          label: "Offer" },
};

const GHOST_STYLE: Record<GhostResult["label"], { bg: string; color: string; text: string }> = {
  likely_real:  { bg: "rgba(100,190,80,0.12)",  color: "#2d6b1a", text: "Real" },
  uncertain:    { bg: "rgba(240,165,0,0.12)",   color: "#8a6800", text: "Uncertain" },
  likely_ghost: { bg: "rgba(220,70,70,0.1)",    color: "#8b1a1a", text: "Ghost" },
};

export default function PipelineClient({ applications }: { applications: Application[] }) {
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [running, setRunning]   = useState(false);

  // Ghost scores: keyed by app _id
  const [ghostScores, setGhostScores]   = useState<Record<string, GhostResult>>({});
  const [ghostLoading, setGhostLoading] = useState<Record<string, boolean>>({});
  const [ghostExpanded, setGhostExpanded] = useState<string | null>(null);

  const visible = applications.filter((a) => {
    const matchesFilter = filter === "all" || a.status === filter;
    const matchesSearch =
      search.length === 0 ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.jobTitle.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const runLoop = async () => {
    setRunning(true);
    try {
      await fetch("/api/jobs/discover", { method: "POST" });
    } finally {
      setRunning(false);
    }
  };

  const checkGhost = async (app: Application) => {
    if (ghostScores[app._id] || ghostLoading[app._id]) {
      // Already loaded — toggle expanded panel
      setGhostExpanded((prev) => prev === app._id ? null : app._id);
      return;
    }
    setGhostLoading((prev) => ({ ...prev, [app._id]: true }));
    try {
      const res  = await fetch("/api/jobs/ghost-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle:       app.jobTitle,
          company:        app.company,
          postedDaysAgo:  Math.round((Date.now() - new Date(app.appliedAt).getTime()) / 86_400_000),
          description:    "",
          salary:         app.salary,
        }),
      });
      const data: GhostResult = await res.json();
      setGhostScores((prev) => ({ ...prev, [app._id]: data }));
      setGhostExpanded(app._id);
    } finally {
      setGhostLoading((prev) => ({ ...prev, [app._id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {applications.length} total applications
        </p>
        <button
          onClick={runLoop}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--lime)" }}
        >
          <RefreshCw size={13} className={running ? "animate-spin" : ""} />
          {running ? "Discovering jobs…" : "Run job loop"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-[200px]"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Search size={13} style={{ color: "var(--ink-3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or role…"
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: "var(--ink)" }}
          />
        </div>
        <div
          className="flex gap-1 p-1 rounded-xl border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-[9px] text-xs font-medium capitalize transition-all"
              style={{
                background: filter === s ? "var(--ink)" : "transparent",
                color: filter === s ? "var(--lime)" : "var(--ink-2)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              {applications.length === 0 ? "No applications yet" : "No results for this filter"}
            </div>
            <div className="text-xs" style={{ color: "var(--ink-3)" }}>
              {applications.length === 0
                ? "Click 'Run job loop' to start discovering and applying to jobs"
                : "Try a different status filter or search term"}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                {["Company / Role", "Status", "ATS", "Ghost?", "Source", "Applied", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-2xs uppercase tracking-widest font-medium"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((app) => {
                const s     = STATUS_STYLE[app.status] || STATUS_STYLE.applied;
                const ghost = ghostScores[app._id];
                const gs    = ghost ? GHOST_STYLE[ghost.label] : null;
                const isLoading = ghostLoading[app._id];
                const isExpanded = ghostExpanded === app._id;

                return (
                  <>
                    <tr
                      key={app._id}
                      className="hover:bg-[#f4f5f1]/60 transition-colors"
                      style={{ borderBottom: isExpanded ? "none" : "0.5px solid var(--border)" }}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{app.company}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{app.jobTitle}</div>
                        {app.location && (
                          <div className="text-2xs mt-0.5 font-mono" style={{ color: "var(--ink-3)" }}>{app.location}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {app.atsScore ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(24,25,26,0.08)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${app.atsScore}%`,
                                  background: app.atsScore >= 80 ? "var(--lime)" : app.atsScore >= 60 ? "#f0a500" : "#dc4646",
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>{app.atsScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {gs ? (
                          <button
                            onClick={() => setGhostExpanded((p) => p === app._id ? null : app._id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono transition-opacity hover:opacity-75"
                            style={{ background: gs.bg, color: gs.color }}
                          >
                            <Ghost size={10} />
                            {gs.text} {ghost.score}
                          </button>
                        ) : (
                          <button
                            onClick={() => checkGhost(app)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 text-xs font-mono transition-opacity hover:opacity-70 disabled:opacity-40"
                            style={{ color: "var(--ink-3)" }}
                          >
                            {isLoading
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Ghost size={11} />}
                            {isLoading ? "" : "Check"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono capitalize" style={{ color: "var(--ink-3)" }}>
                            {app.source ?? "—"}
                          </span>
                          {app.applyMethod === "greenhouse_api" && (
                            <span className="text-2xs font-mono" style={{ color: "#2d6b1a" }}>
                              auto-applied
                            </span>
                          )}
                          {app.applyMethod === "browser_queued" && (
                            <span className="text-2xs font-mono" style={{ color: "#8a6800" }}>
                              queued
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                          {format(new Date(app.appliedAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                            style={{ color: "var(--ink-3)" }}
                          >
                            <ExternalLink size={11} />
                            View
                          </a>
                        )}
                      </td>
                    </tr>

                    {/* Ghost detail panel */}
                    {isExpanded && ghost && (
                      <tr key={`${app._id}-ghost`} style={{ borderBottom: "0.5px solid var(--border)" }}>
                        <td colSpan={7} className="px-4 pb-4 pt-0">
                          <div
                            className="rounded-xl p-3 space-y-2 text-xs"
                            style={{ background: `${gs?.bg ?? "rgba(24,25,26,0.04)"}`, border: `1px solid ${gs?.color ?? "var(--border)"}20` }}
                          >
                            <div className="font-medium" style={{ color: gs?.color }}>
                              Ghost probability: {ghost.score}/100 — {ghost.label.replace("_", " ")}
                            </div>
                            <ul className="space-y-0.5 list-disc list-inside" style={{ color: "var(--ink-2)" }}>
                              {ghost.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                            <div className="pt-1" style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
                              {ghost.recommendation}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
