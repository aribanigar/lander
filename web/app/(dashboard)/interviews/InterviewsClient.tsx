"use client";

import { useState } from "react";
import { format, isAfter, startOfDay } from "date-fns";
import {
  Brain, ChevronDown, ChevronUp, RefreshCw,
  ExternalLink, CheckCircle2, AlertCircle,
} from "lucide-react";

interface Interview {
  _id: string;
  company: string;
  jobTitle: string;
  scheduledAt: string;
  type: string;
  meetingLink?: string;
  preparationNotes?: string;
}

interface PrepData {
  companyOverview: string;
  likelyQuestions: string[];
  suggestedAnswers: Array<{ question: string; guidance: string }>;
  redFlags: string[];
  smartQuestions: string[];
  salaryAnchor: string;
  closingAdvice: string;
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  phone:     { bg: "rgba(60,120,220,0.1)",  color: "#1a4a9e" },
  video:     { bg: "rgba(100,190,80,0.12)", color: "#2d6b1a" },
  "in-person": { bg: "rgba(200,224,50,0.18)", color: "var(--lime-dark)" },
  panel:     { bg: "rgba(220,140,30,0.12)", color: "#8b4a00" },
};

function PrepBriefing({ prep }: { prep: PrepData }) {
  return (
    <div className="space-y-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
      {/* Company overview */}
      <div>
        <div className="text-xs uppercase tracking-widest font-medium mb-1.5" style={{ color: "var(--ink-3)" }}>
          Company briefing
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{prep.companyOverview}</p>
      </div>

      {/* Likely questions */}
      <div>
        <div className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
          Likely interview questions
        </div>
        <div className="space-y-1.5">
          {prep.likelyQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-mono mt-0.5 flex-shrink-0" style={{ color: "var(--ink-3)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm" style={{ color: "var(--ink)" }}>{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested answers */}
      {prep.suggestedAnswers?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
            Answer guidance (trickiest questions)
          </div>
          <div className="space-y-3">
            {prep.suggestedAnswers.map((item, i) => (
              <div key={i} className="rounded-xl p-3 space-y-1" style={{ background: "var(--page)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.question}</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>{item.guidance}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart questions to ask */}
      <div>
        <div className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
          Questions to ask them
        </div>
        <div className="space-y-1.5">
          {prep.smartQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: "var(--lime-dark)" }} />
              <span className="text-sm" style={{ color: "var(--ink)" }}>{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Red flags */}
      {prep.redFlags?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
            Watch out for
          </div>
          <div className="space-y-1.5">
            {prep.redFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#dc7020" }} />
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary + closing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "rgba(200,224,50,0.1)" }}>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--lime-dark)" }}>Salary strategy</div>
          <div className="text-sm" style={{ color: "var(--ink)" }}>{prep.salaryAnchor}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--page)" }}>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--ink-3)" }}>Mindset tip</div>
          <div className="text-sm" style={{ color: "var(--ink)" }}>{prep.closingAdvice}</div>
        </div>
      </div>
    </div>
  );
}

function InterviewCard({ iv }: { iv: Interview }) {
  const [expanded, setExpanded]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prep, setPrep]             = useState<PrepData | null>(
    iv.preparationNotes ? (() => { try { return JSON.parse(iv.preparationNotes!); } catch { return null; } })() : null
  );
  const [jobDesc, setJobDesc]       = useState("");
  const [showDescInput, setShowDescInput] = useState(false);

  const generatePrep = async () => {
    setGenerating(true);
    setShowDescInput(false);
    try {
      const res = await fetch("/api/interviews/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: iv._id, jobDescription: jobDesc }),
      });
      const data = await res.json();
      if (res.ok) { setPrep(data.prep); setExpanded(true); }
    } finally {
      setGenerating(false);
    }
  };

  const tBadge = TYPE_BADGE[iv.type] ?? { bg: "rgba(24,25,26,0.06)", color: "var(--ink-2)" };
  const isUpcoming = isAfter(new Date(iv.scheduledAt), startOfDay(new Date()));

  return (
    <div
      className="card space-y-0"
      style={{ opacity: isUpcoming ? 1 : 0.6 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
            style={{ background: isUpcoming ? "var(--lime)" : "rgba(24,25,26,0.06)", color: isUpcoming ? "var(--lime-dark)" : "var(--ink-3)" }}
          >
            {format(new Date(iv.scheduledAt), "d")}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {iv.company} — {iv.jobTitle}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              {format(new Date(iv.scheduledAt), "EEEE, MMMM d · HH:mm")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
            style={{ background: tBadge.bg, color: tBadge.color }}
          >
            {iv.type}
          </span>

          {iv.meetingLink && (
            <a
              href={iv.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--ink)", color: "var(--lime)" }}
            >
              <ExternalLink size={11} /> Join
            </a>
          )}

          {/* Prep button */}
          {isUpcoming && (
            prep ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
              >
                <Brain size={11} style={{ color: "var(--lime-dark)" }} />
                {expanded ? "Hide prep" : "View prep"}
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            ) : (
              <button
                onClick={() => setShowDescInput((v) => !v)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "rgba(200,224,50,0.15)", color: "var(--lime-dark)" }}
              >
                {generating
                  ? <><RefreshCw size={11} className="animate-spin" /> Generating…</>
                  : <><Brain size={11} /> Generate prep</>}
              </button>
            )
          )}
        </div>
      </div>

      {/* Optional job description input */}
      {showDescInput && !prep && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            Paste the job description for more precise prep (optional)
          </div>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the job description here…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--page)", border: "0.5px solid var(--border)", color: "var(--ink)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={generatePrep}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "var(--ink)", color: "var(--lime)" }}
            >
              {generating ? "Generating…" : "Generate briefing"}
            </button>
            <button
              onClick={() => setShowDescInput(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium border"
              style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Prep briefing */}
      {expanded && prep && <PrepBriefing prep={prep} />}
    </div>
  );
}

export default function InterviewsClient({ interviews }: { interviews: Interview[] }) {
  const upcoming = interviews.filter((i) => isAfter(new Date(i.scheduledAt), startOfDay(new Date())));
  const past     = interviews.filter((i) => !isAfter(new Date(i.scheduledAt), startOfDay(new Date())));

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        {upcoming.length} upcoming · {past.length} completed — click &quot;Generate prep&quot; for an AI briefing
      </p>

      {interviews.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No interviews scheduled</div>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            Interviews will appear here when companies invite you — keep the applications running.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--ink-3)" }}>
                Upcoming
              </div>
              <div className="space-y-2">
                {upcoming.map((iv) => <InterviewCard key={iv._id} iv={iv} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--ink-3)" }}>
                Past
              </div>
              <div className="space-y-2">
                {past.map((iv) => <InterviewCard key={iv._id} iv={iv} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
