"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Plus, Sparkles, Download, Eye } from "lucide-react";

interface ResumeDoc {
  _id: string; jobTitle?: string; company?: string; fileName?: string;
  atsScore?: number; isMaster: boolean; updatedAt: string; version: number;
}

export default function ResumeClient({ resumes }: { resumes: ResumeDoc[] }) {
  const [generating, setGenerating] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [showTailor, setShowTailor] = useState(false);

  const baseResume = resumes.find((r) => r.isMaster);
  const tailoredResumes = resumes.filter((r) => !r.isMaster);

  const tailorResume = async () => {
    if (!jobDesc.trim() || !jobTitle.trim() || !company.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, company, jobDescription: jobDesc }),
      });
      if (res.ok) {
        setJobDesc(""); setJobTitle(""); setCompany("");
        setShowTailor(false);
        window.location.reload();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            {resumes.length} resume version{resumes.length !== 1 ? "s" : ""} · auto-tailored per application
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTailor(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium"
            style={{ background: "var(--lime)", color: "var(--lime-dark)" }}
          >
            <Sparkles size={13} />
            Tailor for a job
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--ink-2)" }}
          >
            <Plus size={13} />
            Upload resume
          </button>
        </div>
      </div>

      {/* Tailor modal */}
      {showTailor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
          <div className="card w-full max-w-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} style={{ color: "var(--lime-dark)" }} />
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                Tailor resume for a specific job
              </h2>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
              Paste the full job description. Claude AI will extract keywords, align your experience, and generate an ATS-optimised version.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job title (e.g. Senior Designer)"
                className="px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                className="px-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
              />
            </div>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description here…"
              rows={8}
              className="w-full rounded-xl p-4 text-sm outline-none resize-none border transition-colors"
              style={{
                background: "var(--card-off)",
                borderColor: "var(--border)",
                color: "var(--ink)",
                fontFamily: "var(--font-sans)",
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={tailorResume}
                disabled={generating || !jobDesc.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--lime)" }}
              >
                {generating ? (
                  <>
                    <Sparkles size={13} className="animate-pulse" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Generate tailored resume
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowTailor(false); setJobDesc(""); setJobTitle(""); setCompany(""); }}
                className="px-4 py-2.5 rounded-xl text-sm border"
                style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* Base resume */}
        <div className="col-span-5">
          <div className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
            Base Resume
          </div>
          {baseResume ? (
            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--lime)" }}>
                  <FileText size={18} style={{ color: "var(--lime-dark)" }} />
                </div>
                <div className="flex gap-1.5">
                  <button className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: "var(--ink-3)" }}>
                    <Eye size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: "var(--ink-3)" }}>
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{baseResume.fileName ?? "Master Resume"}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                v{baseResume.version} · Updated {format(new Date(baseResume.updatedAt), "MMM d, yyyy")}
              </div>
              {baseResume.atsScore && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xs font-medium" style={{ color: "var(--ink-3)" }}>ATS Score</span>
                    <span className="text-xs font-bold font-mono" style={{ color: "var(--ink)" }}>{baseResume.atsScore}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(24,25,26,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${baseResume.atsScore}%`, background: "var(--lime)" }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card py-10 text-center border-dashed" style={{ borderColor: "var(--border)", borderWidth: "0.5px" }}>
              <FileText size={24} className="mx-auto mb-2" style={{ color: "var(--ink-3)" }} />
              <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No base resume yet</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                Upload a PDF/DOCX or we&apos;ll build one from your profile
              </div>
            </div>
          )}
        </div>

        {/* Tailored versions */}
        <div className="col-span-7">
          <div className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
            Tailored Versions ({tailoredResumes.length})
          </div>
          {tailoredResumes.length === 0 ? (
            <div className="card-off rounded-2xl py-10 text-center">
              <Sparkles size={20} className="mx-auto mb-2" style={{ color: "var(--ink-3)" }} />
              <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No tailored resumes yet</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                These are auto-generated whenever you apply to a job, tailored to that specific JD.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tailoredResumes.map((r) => (
                <div
                  key={r._id}
                  className="card-off rounded-2xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                      {r.company ?? "Tailored"} — {r.jobTitle ?? "Resume"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                      v{r.version} · {format(new Date(r.updatedAt), "MMM d")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.atsScore && (
                      <span className="text-sm font-bold font-mono" style={{ color: r.atsScore >= 80 ? "#2d6b1a" : "var(--ink-2)" }}>
                        {r.atsScore}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--ink-3)" }}>
                        <Eye size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--ink-3)" }}>
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
