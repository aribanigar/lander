"use client";

import { useState } from "react";
import { Users, Linkedin, Mail, Search, Loader2, MessageSquare, Copy, Check } from "lucide-react";

interface Referrer {
  name: string | null;
  title: string | null;
  linkedin: string | null;
  email: string | null;
  avatar: string | null;
  referralScore: number;
  messageTip: string;
}

export default function ReferralsClient() {
  const [company, setCompany]       = useState("");
  const [jobTitle, setJobTitle]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [referrers, setReferrers]   = useState<Referrer[]>([]);
  const [searched, setSearched]     = useState(false);
  const [copied, setCopied]         = useState<number | null>(null);
  const [expanded, setExpanded]     = useState<number | null>(null);

  const search = async () => {
    if (!company.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res  = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), jobTitle: jobTitle.trim() }),
      });
      const data = await res.json();
      setReferrers(data.referrers ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const copyTip = (tip: string, index: number) => {
    navigator.clipboard.writeText(tip);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const scoreColor = (score: number) =>
    score >= 75 ? "#2d6b1a" : score >= 50 ? "#8a6800" : "var(--ink-3)";

  const scoreLabel = (score: number) =>
    score >= 75 ? "Strong match" : score >= 50 ? "Good match" : "Possible";

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Explainer */}
      <div className="card" style={{ borderLeft: "3px solid var(--lime)" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Find your warm intro
        </div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Referred candidates are 4x more likely to get hired. Enter a target company and we will
          find employees who can refer you — ranked by how likely they are to help, with a
          ready-to-send message.
        </div>
      </div>

      {/* Search bar */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-2)" }}>
              Company name
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. Stripe"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors"
              style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-2)" }}>
              Role you are applying for
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. Senior Designer"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors"
              style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
            />
          </div>
        </div>
        <button
          onClick={search}
          disabled={loading || !company.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--lime)" }}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Searching…</>
            : <><Search size={14} /> Find referrers</>}
        </button>
      </div>

      {/* Results */}
      {searched && referrers.length === 0 && (
        <div className="card py-12 text-center">
          <Users size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--ink)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
            No employees found for this company
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            Try a different company name or search on LinkedIn directly
          </div>
        </div>
      )}

      {referrers.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
            {referrers.length} potential referrers at {company}
          </div>

          {referrers.map((r, i) => (
            <div
              key={i}
              className="card space-y-3"
            >
              {/* Person header */}
              <div className="flex items-center gap-3">
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.avatar}
                    alt={r.name ?? ""}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: "var(--lime)", color: "var(--lime-dark)" }}
                  >
                    {(r.name ?? "?")[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {r.name ?? "Unknown"}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--ink-3)" }}>
                    {r.title ?? "Employee"}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Score pill */}
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: `${scoreColor(r.referralScore)}18`,
                      color: scoreColor(r.referralScore),
                    }}
                  >
                    {scoreLabel(r.referralScore)}
                  </span>

                  {/* Channels */}
                  {r.linkedin && (
                    <a
                      href={r.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: "rgba(10,102,194,0.1)", color: "#0a66c2" }}
                      title="LinkedIn profile"
                    >
                      <Linkedin size={13} />
                    </a>
                  )}
                  {r.email && (
                    <a
                      href={`mailto:${r.email}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: "rgba(24,25,26,0.06)", color: "var(--ink-2)" }}
                      title={r.email}
                    >
                      <Mail size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Message tip toggle */}
              <div>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-2)" }}
                >
                  <MessageSquare size={12} />
                  {expanded === i ? "Hide message" : "Show ready-to-send message"}
                </button>

                {expanded === i && (
                  <div className="mt-3 space-y-2">
                    <div
                      className="text-xs leading-relaxed p-3 rounded-xl"
                      style={{ background: "var(--card-off)", color: "var(--ink)", fontFamily: "var(--font-mono)" }}
                    >
                      {r.messageTip}
                    </div>
                    <button
                      onClick={() => copyTip(r.messageTip, i)}
                      className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {copied === i
                        ? <><Check size={11} style={{ color: "#2d6b1a" }} /> Copied!</>
                        : <><Copy size={11} /> Copy message</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
