"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Target, Lightbulb, Zap, Loader2,
  BarChart3, Calendar, CheckCircle2, AlertCircle, MinusCircle,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */
interface InsightItem { finding: string; action: string; }
interface InsightData {
  topInsight: string;
  insights: InsightItem[];
  winningPattern: string;
  weakestLink: string;
  weeklyTarget: string;
}
interface Stats {
  totalApplied: number; totalViewed: number; totalReplied: number;
  totalInterview: number; replyRate: number; avgAts: number | null;
}

interface KeyFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}
interface OfferPrediction {
  oneMonth: number; twoMonths: number; threeMonths: number;
  expectedOfferDate: string;
  searchHealthScore: number;
  confidence: "low" | "medium" | "high";
  keyFactors: KeyFactor[];
  recommendations: string[];
  summary: string;
}
interface PredictionStats {
  totalApplied: number; totalViewed: number; totalReplied: number;
  totalInterview: number; totalRejected: number; totalOffers: number;
  replyRate: number; interviewRate: number; daysActive: number;
  dailyVelocity: number; avgAtsScore: number | null; platformCount: number;
}

/* ── Circular gauge ───────────────────────────────────── */
function CircleGauge({ value, label, size = 88 }: { value: number; label: string; size?: number }) {
  const r      = (size - 10) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color  = value >= 60 ? "#4caf50" : value >= 30 ? "var(--lime)" : "var(--ink-2)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="text-center -mt-1" style={{ marginTop: `-${size / 2 + 4}px`, position: "relative", zIndex: 1, lineHeight: 1 }}>
        <div className="text-xl font-bold" style={{ color }}>{value}%</div>
      </div>
      <div className="text-xs font-medium text-center" style={{ color: "var(--ink-2)", marginTop: `${size / 2 - 12}px` }}>
        {label}
      </div>
    </div>
  );
}

/* ── Health score bar ─────────────────────────────────── */
function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "#4caf50" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Strong" : score >= 40 ? "Average" : "Needs work";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--ink-2)" }}>Search health</span>
        <span className="font-bold" style={{ color }}>{score}/100 — {label}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(24,25,26,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */
export default function IntelligenceClient() {
  const [loading, setLoading]       = useState(false);
  const [insights, setInsights]     = useState<InsightData | null>(null);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const [predLoading, setPredLoading]       = useState(false);
  const [prediction, setPrediction]         = useState<OfferPrediction | null>(null);
  const [predStats, setPredStats]           = useState<PredictionStats | null>(null);
  const [predError, setPredError]           = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/intelligence");
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? "Failed"); return; }
      setInsights(data.insights);
      setStats(data.stats);
    } finally { setLoading(false); }
  };

  const runPrediction = async () => {
    setPredLoading(true); setPredError(null);
    try {
      const res  = await fetch("/api/prediction");
      const data = await res.json();
      if (!res.ok) { setPredError(data.message ?? data.error ?? "Failed"); return; }
      setPrediction(data.prediction);
      setPredStats(data.stats);
    } finally { setPredLoading(false); }
  };

  const pct = (n: number, of: number) => of === 0 ? 0 : Math.round((n / of) * 100);

  const factorIcon = (impact: KeyFactor["impact"]) => {
    if (impact === "positive") return <CheckCircle2 size={13} style={{ color: "#4caf50" }} />;
    if (impact === "negative") return <AlertCircle  size={13} style={{ color: "#ef4444" }} />;
    return <MinusCircle size={13} style={{ color: "var(--ink-3)" }} />;
  };

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Offer Prediction ──────────────────────────────── */}
      <div className="card space-y-4" style={{ borderLeft: "3px solid var(--lime)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>
              Offer Probability Prediction
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
              Claude analyses your full application history, response rates, and profile to predict your probability of receiving a job offer in 1, 2, and 3 months.
            </div>
          </div>
          <button
            onClick={runPrediction}
            disabled={predLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50 flex-shrink-0"
            style={{ background: "var(--lime)", color: "var(--lime-dark)" }}
          >
            {predLoading
              ? <><Loader2 size={14} className="animate-spin" /> Predicting…</>
              : <><Calendar size={14} /> Run prediction</>}
          </button>
        </div>

        {predError && (
          <div className="text-xs px-3 py-2.5 rounded-xl" style={{ background: "rgba(220,70,70,0.08)", color: "#8b1a1a" }}>
            {predError}
          </div>
        )}

        {prediction && predStats && (
          <div className="space-y-5">
            {/* Probabilities */}
            <div className="flex items-start justify-around pt-2">
              <CircleGauge value={prediction.oneMonth}   label="1 month"  />
              <CircleGauge value={prediction.twoMonths}  label="2 months" />
              <CircleGauge value={prediction.threeMonths} label="3 months" />
            </div>

            {/* Health + expected date */}
            <div className="space-y-3">
              <HealthBar score={prediction.searchHealthScore} />
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                <Calendar size={12} />
                <span>Expected offer: <strong style={{ color: "var(--ink)" }}>{prediction.expectedOfferDate}</strong></span>
                <span className="opacity-40">·</span>
                <span className="capitalize">Confidence: <strong>{prediction.confidence}</strong></span>
              </div>
            </div>

            {/* Summary */}
            <div
              className="px-4 py-3 rounded-xl text-xs leading-relaxed"
              style={{ background: "var(--card-off)", color: "var(--ink-2)" }}
            >
              {prediction.summary}
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Applied",    value: predStats.totalApplied },
                { label: "Reply rate", value: `${predStats.replyRate}%` },
                { label: "Interviews", value: predStats.totalInterview },
                { label: "Apps/day",   value: predStats.dailyVelocity.toFixed(1) },
              ].map((s) => (
                <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "var(--card-off)" }}>
                  <div className="text-lg font-bold" style={{ color: "var(--ink)" }}>{s.value}</div>
                  <div className="text-2xs" style={{ color: "var(--ink-3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Key factors */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
                Key factors
              </div>
              {prediction.keyFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="mt-0.5 flex-shrink-0">{factorIcon(f.impact)}</div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--ink)" }}>{f.factor}</div>
                    <div className="text-xs" style={{ color: "var(--ink-3)" }}>{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
                Do this now
              </div>
              {prediction.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-2xs font-bold mt-0.5"
                    style={{ background: "var(--lime)", color: "var(--lime-dark)" }}
                  >
                    {i + 1}
                  </div>
                  <div className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{r}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Response Pattern Intelligence ─────────────────── */}
      <div className="card flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>
            Response Pattern Intelligence
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Claude analyses your full application funnel — ATS scores, reply rates, interview
            conversion — and tells you exactly what to change this week. Requires at least 5 applications.
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50 flex-shrink-0"
          style={{ background: "var(--ink)", color: "var(--lime)" }}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Analysing…</>
            : <><BarChart3 size={14} /> Generate insights</>}
        </button>
      </div>

      {error && (
        <div className="card text-sm py-4 text-center" style={{ color: "var(--ink-2)", borderColor: "rgba(220,70,70,0.2)" }}>
          {error}
        </div>
      )}

      {/* Funnel stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Applied",    value: stats.totalApplied,    sub: "total",                                    color: "var(--ink)" },
            { label: "Reply rate", value: `${stats.replyRate}%`, sub: `${stats.totalReplied} replied`,            color: stats.replyRate >= 10 ? "#2d6b1a" : "#8b1a1a" },
            { label: "Interviews", value: stats.totalInterview,  sub: `${pct(stats.totalInterview, stats.totalApplied)}% of applied`, color: "var(--lime-dark)" },
            { label: "Avg ATS",   value: stats.avgAts ?? "—",    sub: "resume score",                            color: "var(--ink-2)" },
          ].map((s) => (
            <div key={s.label} className="card text-center space-y-1">
              <div className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-medium" style={{ color: "var(--ink)" }}>{s.label}</div>
              <div className="text-2xs" style={{ color: "var(--ink-3)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel bar */}
      {stats && (
        <div className="card space-y-3">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Funnel</div>
          {[
            { label: "Applied",    count: stats.totalApplied,   pctOf: stats.totalApplied },
            { label: "Viewed",     count: stats.totalViewed,    pctOf: stats.totalApplied },
            { label: "Replied",    count: stats.totalReplied,   pctOf: stats.totalApplied },
            { label: "Interviews", count: stats.totalInterview, pctOf: stats.totalApplied },
          ].map((row) => {
            const width    = pct(row.count, row.pctOf);
            const barColor = row.label === "Applied" ? "var(--ink)" : row.label === "Interviews" ? "var(--lime)" : "rgba(24,25,26,0.4)";
            return (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-20 text-xs font-medium text-right flex-shrink-0" style={{ color: "var(--ink-2)" }}>{row.label}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(24,25,26,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, background: barColor }} />
                </div>
                <div className="w-10 text-xs font-mono flex-shrink-0" style={{ color: "var(--ink-3)" }}>{row.count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI insights */}
      {insights && (
        <div className="space-y-4">
          <div className="card" style={{ background: "var(--ink)", color: "var(--lime)" }}>
            <div className="flex items-start gap-3">
              <Zap size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1 opacity-70">Key finding</div>
                <div className="text-sm font-medium leading-snug">{insights.topInsight}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card flex items-start gap-3">
              <TrendingUp size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#2d6b1a" }} />
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--ink-2)" }}>What is working</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{insights.winningPattern}</div>
              </div>
            </div>
            <div className="card flex items-start gap-3">
              <TrendingDown size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#8b1a1a" }} />
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--ink-2)" }}>Weakest link</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{insights.weakestLink}</div>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Actionable insights</div>
            {insights.insights.map((item, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b last:pb-0 last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-2xs font-bold mt-0.5" style={{ background: "var(--lime)", color: "var(--lime-dark)" }}>
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>{item.finding}</div>
                  <div className="flex items-start gap-1.5">
                    <Lightbulb size={11} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ink-3)" }} />
                    <div className="text-xs" style={{ color: "var(--ink-2)" }}>{item.action}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card flex items-start gap-3" style={{ borderLeft: "3px solid var(--lime)" }}>
            <Target size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--lime-dark)" }} />
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--ink-2)" }}>This week&apos;s focus</div>
              <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{insights.weeklyTarget}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
