"use client";

import { useState } from "react";
import { format, isPast, differenceInDays } from "date-fns";
import {
  Linkedin, Mail, Plus, Send, Check, X, Clock,
  ChevronDown, ChevronUp, Copy, RefreshCw, MessageSquare, Search, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OutreachItem {
  _id: string;
  company: string;
  jobTitle: string;
  jobUrl?: string;
  contactName?: string;
  contactTitle?: string;
  contactLinkedIn?: string;
  contactEmail?: string;
  message: string;
  platform: "linkedin" | "email" | "other";
  status: "draft" | "sent" | "replied" | "ignored";
  sentAt?: string;
  repliedAt?: string;
  createdAt: string;
}

interface FollowUpItem {
  _id: string;
  company: string;
  jobTitle: string;
  contactEmail?: string;
  dayNumber: 3 | 7 | 14;
  scheduledFor: string;
  draftSubject: string;
  draftMessage: string;
  status: "pending" | "sent" | "skipped" | "replied";
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: "rgba(24,25,26,0.06)",   color: "var(--ink-2)",    label: "Draft" },
  sent:    { bg: "rgba(60,120,220,0.1)",  color: "#1a4a9e",         label: "Sent" },
  replied: { bg: "rgba(100,190,80,0.12)", color: "#2d6b1a",         label: "Replied" },
  ignored: { bg: "rgba(220,70,70,0.1)",   color: "#8b1a1a",         label: "Ignored" },
};

const FU_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(200,224,50,0.18)",  color: "var(--lime-dark)" },
  sent:    { bg: "rgba(60,120,220,0.1)",   color: "#1a4a9e" },
  replied: { bg: "rgba(100,190,80,0.12)", color: "#2d6b1a" },
  skipped: { bg: "rgba(24,25,26,0.06)",   color: "var(--ink-3)" },
};

interface FoundContact {
  name: string | null;
  title: string | null;
  email: string | null;
  linkedin: string | null;
  avatar: string | null;
}

function NewOutreachModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: OutreachItem) => void }) {
  const [form, setForm]             = useState({ company: "", jobTitle: "", jobUrl: "", contactName: "", contactTitle: "", contactLinkedIn: "", contactEmail: "", platform: "linkedin" as "linkedin" | "email" });
  const [loading, setLoading]       = useState(false);
  const [finding, setFinding]       = useState(false);
  const [foundContacts, setFoundContacts] = useState<FoundContact[]>([]);
  const [findError, setFindError]   = useState("");
  const [error, setError]           = useState("");

  const findContact = async () => {
    if (!form.company) { setFindError("Enter a company name first"); return; }
    setFinding(true);
    setFindError("");
    setFoundContacts([]);
    try {
      const res  = await fetch("/api/outreach/find-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: form.company, jobTitle: form.jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Contact search failed");
      setFoundContacts(data.contacts ?? []);
      if ((data.contacts ?? []).length === 0) setFindError("No contacts found — enter details manually");
    } catch (e) {
      setFindError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setFinding(false);
    }
  };

  const selectContact = (c: FoundContact) => {
    setForm((f) => ({
      ...f,
      contactName:     c.name    ?? f.contactName,
      contactTitle:    c.title   ?? f.contactTitle,
      contactLinkedIn: c.linkedin ?? f.contactLinkedIn,
      contactEmail:    c.email   ?? f.contactEmail,
    }));
    setFoundContacts([]);
  };

  const submit = async () => {
    if (!form.company || !form.jobTitle) { setError("Company and job title required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.outreach);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "var(--card)", border: "0.5px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>New warm outreach</h2>
          <button onClick={onClose}><X size={16} style={{ color: "var(--ink-3)" }} /></button>
        </div>

        {/* Company + job title row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Company *",  key: "company",  placeholder: "e.g. Apple" },
            { label: "Job title *", key: "jobTitle", placeholder: "e.g. Senior Designer" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ink-2)" }}>{label}</label>
              <input
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--page)", border: "0.5px solid var(--border)", color: "var(--ink)" }}
              />
            </div>
          ))}
        </div>

        {/* Find contact button */}
        <div>
          <button
            onClick={findContact}
            disabled={finding || !form.company}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
          >
            {finding ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
            {finding ? "Searching Apollo…" : "Find hiring manager automatically"}
          </button>
          {findError && <p className="text-xs mt-1" style={{ color: "#dc4646" }}>{findError}</p>}
        </div>

        {/* Found contacts picker */}
        {foundContacts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Select a contact:</p>
            {foundContacts.map((c, i) => (
              <button
                key={i}
                onClick={() => selectContact(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all hover:opacity-80"
                style={{ background: "var(--page)", borderColor: "var(--border)" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(24,25,26,0.08)" }}>
                  {c.avatar
                    ? <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    : <User size={13} style={{ color: "var(--ink-3)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: "var(--ink)" }}>{c.name ?? "Unknown"}</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>{c.title ?? "—"}</div>
                </div>
                {c.email && <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>email</span>}
                {c.linkedin && <Linkedin size={11} style={{ color: "#0a66c2" }} />}
              </button>
            ))}
          </div>
        )}

        {/* Manual contact fields */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Contact name",  key: "contactName",     placeholder: "e.g. Sarah Chen" },
            { label: "Contact title", key: "contactTitle",    placeholder: "e.g. Design Director" },
            { label: "LinkedIn URL",  key: "contactLinkedIn", placeholder: "linkedin.com/in/..." },
            { label: "Contact email", key: "contactEmail",    placeholder: "sarah@company.com" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ink-2)" }}>{label}</label>
              <input
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--page)", border: "0.5px solid var(--border)", color: "var(--ink)" }}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--ink-2)" }}>Platform</label>
          <div className="flex gap-2">
            {(["linkedin", "email"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setForm((f) => ({ ...f, platform: p }))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                style={{
                  background: form.platform === p ? "var(--ink)" : "transparent",
                  color: form.platform === p ? "var(--lime)" : "var(--ink-2)",
                  borderColor: form.platform === p ? "var(--ink)" : "var(--border)",
                }}
              >
                {p === "linkedin" ? <Linkedin size={12} /> : <Mail size={12} />}
                {p === "linkedin" ? "LinkedIn" : "Email"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs" style={{ color: "#dc4646" }}>{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
          >Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "var(--lime)" }}
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <MessageSquare size={13} />}
            {loading ? "Generating message…" : "Generate message"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutreachCard({ item, onUpdate }: { item: OutreachItem; onUpdate: (id: string, patch: Partial<OutreachItem>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [updating, setUpdating] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(item.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (status: OutreachItem["status"]) => {
    setUpdating(true);
    await fetch(`/api/outreach/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onUpdate(item._id, { status });
    setUpdating(false);
  };

  const s = STATUS_STYLE[item.status];

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{item.company}</span>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>→</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>{item.jobTitle}</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label}
            </span>
          </div>
          {item.contactName && (
            <div className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
              {item.contactName}{item.contactTitle ? ` · ${item.contactTitle}` : ""}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {item.platform === "linkedin" ? (
            <span className="w-6 h-6 flex items-center justify-center rounded-lg" style={{ background: "rgba(10,102,194,0.1)" }}>
              <Linkedin size={12} style={{ color: "#0a66c2" }} />
            </span>
          ) : (
            <span className="w-6 h-6 flex items-center justify-center rounded-lg" style={{ background: "rgba(24,25,26,0.06)" }}>
              <Mail size={12} style={{ color: "var(--ink-3)" }} />
            </span>
          )}
          <button onClick={() => setExpanded((v) => !v)} style={{ color: "var(--ink-3)" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <div
            className="p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: "var(--page)", color: "var(--ink)", fontFamily: "inherit" }}
          >
            {item.message}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy message"}
            </button>

            {item.contactLinkedIn && (
              <a
                href={item.contactLinkedIn.startsWith("http") ? item.contactLinkedIn : `https://${item.contactLinkedIn}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-70"
                style={{ borderColor: "var(--border)", color: "#0a66c2" }}
              >
                <Linkedin size={11} /> Open LinkedIn
              </a>
            )}

            {item.status === "draft" && (
              <button
                onClick={() => updateStatus("sent")}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--ink)", color: "var(--lime)" }}
              >
                <Send size={11} /> Mark sent
              </button>
            )}
            {item.status === "sent" && (
              <button
                onClick={() => updateStatus("replied")}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                style={{ background: "rgba(100,190,80,0.15)", color: "#2d6b1a" }}
              >
                <Check size={11} /> Got reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpCard({ item, onUpdate }: { item: FollowUpItem; onUpdate: (id: string, patch: Partial<FollowUpItem>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [updating, setUpdating] = useState(false);
  const isDue = isPast(new Date(item.scheduledFor));
  const daysUntil = differenceInDays(new Date(item.scheduledFor), new Date());
  const fuStyle = FU_STATUS_STYLE[item.status];

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${item.draftSubject}\n\n${item.draftMessage}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (status: FollowUpItem["status"], action?: string) => {
    setUpdating(true);
    const body: Record<string, string> = { status };
    if (action) body.action = action;
    await fetch(`/api/followup/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onUpdate(item._id, { status });
    setUpdating(false);
  };

  return (
    <div
      className="card space-y-2"
      style={{ borderLeft: isDue && item.status === "pending" ? "3px solid var(--lime)" : "none" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-mono font-medium px-2 py-0.5 rounded"
              style={{ background: fuStyle.bg, color: fuStyle.color }}
            >
              Day {item.dayNumber}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.company}</span>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>{item.jobTitle}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Clock size={10} style={{ color: "var(--ink-3)" }} />
            <span className="text-xs font-mono" style={{ color: isDue && item.status === "pending" ? "var(--lime-dark)" : "var(--ink-3)" }}>
              {item.status === "pending"
                ? isDue ? "Due now" : `Due in ${daysUntil}d · ${format(new Date(item.scheduledFor), "MMM d")}`
                : format(new Date(item.scheduledFor), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded((v) => !v)} style={{ color: "var(--ink-3)" }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--ink-3)" }}>Subject</div>
            <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.draftSubject}</div>
          </div>
          <div
            className="p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: "var(--page)", color: "var(--ink)" }}
          >
            {item.draftMessage}
          </div>

          {item.status === "pending" && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy email"}
              </button>

              {item.contactEmail && (
                <button
                  onClick={() => updateStatus("sent", "send_email")}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                  style={{ background: "var(--ink)", color: "var(--lime)" }}
                >
                  <Send size={11} /> Send now
                </button>
              )}

              <button
                onClick={() => updateStatus("sent")}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(60,120,220,0.1)", color: "#1a4a9e" }}
              >
                <Check size={11} /> Mark sent
              </button>

              <button
                onClick={() => updateStatus("skipped")}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: "var(--ink-3)" }}
              >
                <X size={11} /> Skip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OutreachClient({
  outreachItems: initial,
  followUps: initialFu,
}: {
  outreachItems: OutreachItem[];
  followUps: FollowUpItem[];
}) {
  const [outreach, setOutreach]     = useState(initial);
  const [followUps, setFollowUps]   = useState(initialFu);
  const [tab, setTab]               = useState<"outreach" | "followups">("outreach");
  const [showModal, setShowModal]   = useState(false);

  const dueCount = followUps.filter(
    (f) => f.status === "pending" && isPast(new Date(f.scheduledFor))
  ).length;

  const updateOutreach = (id: string, patch: Partial<OutreachItem>) => {
    setOutreach((prev) => prev.map((o) => (o._id === id ? { ...o, ...patch } : o)));
  };

  const updateFollowUp = (id: string, patch: Partial<FollowUpItem>) => {
    setFollowUps((prev) => prev.map((f) => (f._id === id ? { ...f, ...patch } : f)));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Warm messages beat cold applications 10x — reach out before you apply
        </p>
        {tab === "outreach" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--ink)", color: "var(--lime)" }}
          >
            <Plus size={13} /> New outreach
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        {(["outreach", "followups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all relative"
            style={{
              background: tab === t ? "var(--ink)" : "transparent",
              color: tab === t ? "var(--lime)" : "var(--ink-2)",
            }}
          >
            {t === "outreach" ? "Warm Outreach" : "Follow-ups"}
            {t === "followups" && dueCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: "var(--lime)", color: "var(--lime-dark)" }}
              >
                {dueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "outreach" && (
        <div className="space-y-3">
          {outreach.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No outreach yet</div>
              <div className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
                Find the hiring manager, get an AI-drafted message, track the reply
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{ background: "var(--ink)", color: "var(--lime)" }}
              >
                + Create first outreach
              </button>
            </div>
          ) : (
            outreach.map((item) => (
              <OutreachCard key={item._id} item={item} onUpdate={updateOutreach} />
            ))
          )}
        </div>
      )}

      {tab === "followups" && (
        <div className="space-y-3">
          {followUps.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No follow-ups scheduled</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                Follow-ups are auto-scheduled on day 3, 7 and 14 after each application
              </div>
            </div>
          ) : (
            followUps.map((f) => (
              <FollowUpCard key={f._id} item={f} onUpdate={updateFollowUp} />
            ))
          )}
        </div>
      )}

      {showModal && (
        <NewOutreachModal
          onClose={() => setShowModal(false)}
          onCreated={(item) => setOutreach((prev) => [item, ...prev])}
        />
      )}
    </div>
  );
}
