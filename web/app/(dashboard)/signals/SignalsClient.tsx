"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Zap, TrendingUp, Users, Briefcase, Building2, Globe2, RefreshCw, X, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalItem {
  _id: string;
  company: string;
  companyDomain?: string;
  signalType: "funding" | "headcount_growth" | "exec_hire" | "mass_hire" | "new_office" | "product_launch";
  description: string;
  strength: "strong" | "medium" | "weak";
  confidence: number;
  detectedAt: string;
  actionTaken: boolean;
  dismissed: boolean;
  jobCount?: number;
  fundingAmount?: string;
  source?: string;
}

const SIGNAL_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  funding:          { icon: TrendingUp, bg: "rgba(100,190,80,0.12)", color: "#2d6b1a",         label: "Funding round" },
  headcount_growth: { icon: Users,      bg: "rgba(60,120,220,0.1)",  color: "#1a4a9e",         label: "Headcount growth" },
  exec_hire:        { icon: Briefcase,  bg: "rgba(200,224,50,0.18)", color: "var(--lime-dark)", label: "Exec hire" },
  mass_hire:        { icon: Users,      bg: "rgba(200,224,50,0.22)", color: "var(--lime-dark)", label: "Mass hiring" },
  new_office:       { icon: Building2,  bg: "rgba(150,80,200,0.1)",  color: "#5a1a8b",         label: "New office" },
  product_launch:   { icon: Globe2,     bg: "rgba(220,140,30,0.12)", color: "#8b4a00",         label: "Product launch" },
};

const STRENGTH_DOT: Record<string, string> = {
  strong: "#2d6b1a",
  medium: "#f0a500",
  weak:   "var(--ink-3)",
};

function SignalCard({ item, onDismiss, onAction }: {
  item: SignalItem;
  onDismiss: (id: string) => void;
  onAction:  (id: string) => void;
}) {
  const [acting, setActing]       = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const cfg = SIGNAL_CONFIG[item.signalType] ?? SIGNAL_CONFIG.funding;
  const Icon = cfg.icon;

  const handleAction = async () => {
    setActing(true);
    await fetch(`/api/signals/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionTaken: true }),
    });
    onAction(item._id);
    setActing(false);
  };

  const handleDismiss = async () => {
    setDismissing(true);
    await fetch(`/api/signals/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    onDismiss(item._id);
    setDismissing(false);
  };

  return (
    <div
      className="card space-y-3"
      style={{ borderLeft: item.strength === "strong" ? "3px solid var(--lime)" : "none" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Signal type badge */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: cfg.bg }}
          >
            <Icon size={15} style={{ color: cfg.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{item.company}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              {item.strength === "strong" && (
                <span className="text-xs font-mono" style={{ color: "#2d6b1a" }}>Strong signal</span>
              )}
            </div>

            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {item.description}
            </p>

            <div className="flex items-center gap-3 mt-2">
              {/* Strength indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: STRENGTH_DOT[item.strength] }} />
                <span className="text-xs font-mono capitalize" style={{ color: "var(--ink-3)" }}>
                  {item.strength} · {item.confidence}% confidence
                </span>
              </div>

              {item.jobCount && item.jobCount > 0 && (
                <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                  {item.jobCount} open roles
                </span>
              )}

              <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                {format(new Date(item.detectedAt), "MMM d")}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
        {item.companyDomain && (
          <a
            href={`https://${item.companyDomain}/careers`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
          >
            <Briefcase size={11} /> View jobs
          </a>
        )}

        {!item.actionTaken ? (
          <button
            onClick={handleAction}
            disabled={acting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "var(--lime)" }}
          >
            {acting ? <RefreshCw size={11} className="animate-spin" /> : <ArrowRight size={11} />}
            {acting ? "Applying…" : "Apply to this company"}
          </button>
        ) : (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(100,190,80,0.12)", color: "#2d6b1a" }}
          >
            <Check size={11} /> Applied
          </span>
        )}
      </div>
    </div>
  );
}

export default function SignalsClient({ signals: initial }: { signals: SignalItem[] }) {
  const [signals, setSignals] = useState(initial);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg]   = useState("");
  const [filter, setFilter]     = useState<"all" | SignalItem["strength"]>("all");

  const scan = async () => {
    setScanning(true);
    setScanMsg("");
    try {
      const res = await fetch("/api/signals/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScanMsg(data.error ?? "Scan failed");
      } else {
        const count = (data.newSignals ?? []).length;
        setScanMsg(count > 0 ? `Found ${count} new signal${count > 1 ? "s" : ""}` : "No new signals right now");
        if (count > 0) {
          setSignals((prev) => [...data.newSignals, ...prev]);
        }
      }
    } catch {
      setScanMsg("Scan failed — check your connection");
    } finally {
      setScanning(false);
    }
  };

  const dismiss = (id: string) => setSignals((prev) => prev.filter((s) => s._id !== id));
  const markAction = (id: string) => setSignals((prev) => prev.map((s) => s._id === id ? { ...s, actionTaken: true } : s));

  const visible = signals.filter((s) => filter === "all" || s.strength === filter);

  const strongCount  = signals.filter((s) => s.strength === "strong").length;
  const actionNeeded = signals.filter((s) => !s.actionTaken && s.strength === "strong").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Companies showing signs of active hiring — apply before the crowd
        </p>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--lime)" }}
        >
          <Zap size={13} className={scanning ? "animate-pulse" : ""} />
          {scanning ? "Scanning…" : "Scan companies"}
        </button>
      </div>

      {scanMsg && (
        <div
          className="px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,224,50,0.15)", color: "var(--lime-dark)" }}
        >
          {scanMsg}
        </div>
      )}

      {/* Stats row */}
      {signals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total signals",    value: signals.length,  color: "var(--ink)" },
            { label: "Strong signals",   value: strongCount,     color: "#2d6b1a" },
            { label: "Action needed",    value: actionNeeded,    color: "var(--lime-dark)" },
          ].map((stat) => (
            <div key={stat.label} className="card-off text-center py-3">
              <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {signals.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl w-fit border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          {(["all", "strong", "medium", "weak"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? "var(--ink)" : "transparent",
                color: filter === f ? "var(--lime)" : "var(--ink-2)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Signal cards */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="card py-14 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(200,224,50,0.12)" }}>
              <Zap size={20} style={{ color: "var(--lime-dark)" }} />
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              No signals detected yet
            </div>
            <div className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
              Click "Scan companies" to detect funding rounds, mass hiring, and exec moves in your target market.
              {!process.env.NEXT_PUBLIC_APP_URL?.includes("localhost") ? "" : " Add APOLLO_API_KEY to .env.local to enable live scanning."}
            </div>
            <button
              onClick={scan}
              disabled={scanning}
              className="px-4 py-2 rounded-xl text-xs font-medium mx-auto"
              style={{ background: "var(--ink)", color: "var(--lime)" }}
            >
              <Zap size={11} className={cn("inline mr-1.5", scanning && "animate-pulse")} />
              {scanning ? "Scanning…" : "Scan now"}
            </button>
          </div>
        ) : (
          visible.map((s) => (
            <SignalCard key={s._id} item={s} onDismiss={dismiss} onAction={markAction} />
          ))
        )}
      </div>
    </div>
  );
}
