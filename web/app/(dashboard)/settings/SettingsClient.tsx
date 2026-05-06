"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Loader2, Check, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";

type Profile = {
  fullName?: string; field?: string; role?: string; yearsExp?: string;
  niche?: string; salaryMin?: string; salaryMax?: string; currencySymbol?: string;
  remotePreference?: string; targetRegions?: string[]; linkedinUrl?: string;
  jobType?: string; level?: string;
};

type PlatformConnected = {
  linkedin: boolean;
  indeed:   boolean;
  naukri:   boolean;
  bayt:     boolean;
};

const SECTIONS = [
  { key: "profile",      label: "Profile" },
  { key: "preferences",  label: "Job Preferences" },
  { key: "notifications",label: "Notifications" },
  { key: "integrations", label: "Integrations" },
];

const PLATFORMS: { key: keyof PlatformConnected; label: string; color: string; description: string }[] = [
  {
    key: "linkedin",
    label: "LinkedIn Easy Apply",
    color: "#0a66c2",
    description: "Worker applies to LinkedIn jobs on your behalf using your account",
  },
  {
    key: "indeed",
    label: "Indeed Apply",
    color: "#003a9b",
    description: "Worker applies to Indeed jobs on your behalf using your account",
  },
  {
    key: "naukri",
    label: "Naukri (India)",
    color: "#ff7555",
    description: "Worker applies to Naukri jobs on your behalf using your account",
  },
  {
    key: "bayt",
    label: "Bayt (Middle East)",
    color: "#e31837",
    description: "Worker applies to Bayt jobs on your behalf using your account",
  },
];

export default function SettingsClient({
  profile,
  email,
  gmailConnected,
  gmailEmail,
  platformConnected,
}: {
  profile:           Profile;
  email:             string;
  gmailConnected:    boolean;
  gmailEmail:        string;
  platformConnected: PlatformConnected;
}) {
  const params      = useSearchParams();
  const [active, setActive]   = useState("profile");
  const [form,   setForm]     = useState<Profile>(profile);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [gmailOk, setGmailOk]     = useState(gmailConnected);
  const [gmailAddr, setGmailAddr] = useState(gmailEmail);
  const [connected, setConnected] = useState<PlatformConnected>(platformConnected);

  // Per-platform credential forms
  const [credForms, setCredForms] = useState<Record<string, { email: string; password: string; show: boolean; saving: boolean; open: boolean }>>({
    linkedin: { email: "", password: "", show: false, saving: false, open: false },
    indeed:   { email: "", password: "", show: false, saving: false, open: false },
    naukri:   { email: "", password: "", show: false, saving: false, open: false },
    bayt:     { email: "", password: "", show: false, saving: false, open: false },
  });

  useEffect(() => {
    const g = params.get("gmail");
    if (g === "connected") { setGmailOk(true); setActive("integrations"); }
    if (g === "error")     { setScanResult("Gmail connection failed — check your Google Cloud Console settings."); setActive("integrations"); }
  }, [params]);

  const set = (key: keyof Profile, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const scanNow = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res  = await fetch("/api/gmail/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setScanResult(data.error ?? "Scan failed"); return; }
      setScanResult(`Scanned inbox — ${data.processed} new ${data.processed === 1 ? "reply" : "replies"} found and classified.`);
    } finally {
      setScanning(false);
    }
  };

  const saveCreds = async (platform: keyof PlatformConnected) => {
    const cf = credForms[platform];
    if (!cf.email || !cf.password) return;

    setCredForms((prev) => ({ ...prev, [platform]: { ...prev[platform], saving: true } }));
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, email: cf.email, password: cf.password }),
      });
      if (res.ok) {
        setConnected((prev) => ({ ...prev, [platform]: true }));
        setCredForms((prev) => ({
          ...prev,
          [platform]: { ...prev[platform], email: "", password: "", open: false, saving: false },
        }));
      }
    } finally {
      setCredForms((prev) => ({ ...prev, [platform]: { ...prev[platform], saving: false } }));
    }
  };

  const removeCreds = async (platform: keyof PlatformConnected) => {
    await fetch(`/api/credentials?platform=${platform}`, { method: "DELETE" });
    setConnected((prev) => ({ ...prev, [platform]: false }));
  };

  const Field = ({ label, id, value, onChange, placeholder }: {
    label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-2)" }}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors"
        style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>{email}</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <div className="col-span-3">
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active === s.key ? "var(--ink)" : "transparent",
                  color:      active === s.key ? "var(--lime)" : "var(--ink-2)",
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-9 card space-y-5">

          {/* ── Profile ── */}
          {active === "profile" && (
            <>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" id="fullName" value={form.fullName ?? ""} onChange={(v) => set("fullName", v)} placeholder="Your name" />
                <Field label="Field / industry" id="field" value={form.field ?? ""} onChange={(v) => set("field", v)} placeholder="Graphic Design" />
                <Field label="Target job title" id="role" value={form.role ?? ""} onChange={(v) => set("role", v)} placeholder="Senior Art Director" />
                <Field label="Years of experience" id="yearsExp" value={form.yearsExp ?? ""} onChange={(v) => set("yearsExp", v)} placeholder="15" />
                <Field label="LinkedIn URL" id="linkedinUrl" value={form.linkedinUrl ?? ""} onChange={(v) => set("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-2)" }}>Your niche (one sentence)</label>
                <textarea
                  value={form.niche ?? ""}
                  onChange={(e) => set("niche", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border resize-none transition-colors"
                  style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
                  placeholder="Senior graphic designer with 15 years in FMCG brand campaigns..."
                />
              </div>
            </>
          )}

          {/* ── Preferences ── */}
          {active === "preferences" && (
            <>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Job Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Job type" id="jobType" value={form.jobType ?? ""} onChange={(v) => set("jobType", v)} placeholder="Full-time" />
                <Field label="Seniority level" id="level" value={form.level ?? ""} onChange={(v) => set("level", v)} placeholder="Senior" />
                <Field label="Remote preference" id="remotePreference" value={form.remotePreference ?? ""} onChange={(v) => set("remotePreference", v)} placeholder="Hybrid" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-2)" }}>Salary range</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={form.currencySymbol ?? "$"}
                    onChange={(e) => set("currencySymbol", e.target.value)}
                    className="px-3 py-2.5 rounded-xl text-sm outline-none border"
                    style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }}
                  >
                    {["$", "£", "€", "AED", "INR"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value)} placeholder="Min" className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none border" style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }} />
                  <span style={{ color: "var(--ink-3)" }}>—</span>
                  <input value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value)} placeholder="Max" className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none border" style={{ background: "var(--card-off)", borderColor: "var(--border)", color: "var(--ink)" }} />
                </div>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {active === "notifications" && (
            <>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Notifications</h2>
              <div className="space-y-3">
                {[
                  "Email when I apply to a job",
                  "Email on genuine recruiter reply",
                  "Email on rejection",
                  "Email when interview is confirmed",
                ].map((label) => (
                  <label key={label} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm" style={{ color: "var(--ink)" }}>{label}</span>
                    <div className="w-9 h-5 rounded-full relative" style={{ background: "var(--lime)" }}>
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* ── Integrations ── */}
          {active === "integrations" && (
            <>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Integrations</h2>

              {scanResult && (
                <div
                  className="text-xs px-3 py-2.5 rounded-xl"
                  style={{
                    background: scanResult.includes("failed") || scanResult.includes("error") ? "rgba(220,70,70,0.08)" : "rgba(100,190,80,0.10)",
                    color:      scanResult.includes("failed") || scanResult.includes("error") ? "#8b1a1a" : "#2d6b1a",
                  }}
                >
                  {scanResult}
                </div>
              )}

              <div className="space-y-3">

                {/* Gmail */}
                <div
                  className="rounded-xl border p-4 space-y-3"
                  style={{ borderColor: "var(--border)", background: "var(--card-off)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: gmailOk ? "rgba(100,190,80,0.12)" : "rgba(24,25,26,0.06)" }}
                      >
                        <Mail size={15} style={{ color: gmailOk ? "#2d6b1a" : "var(--ink-3)" }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                          Gmail reply monitor
                          {gmailOk && gmailAddr && (
                            <span className="ml-2 text-xs font-normal" style={{ color: "var(--ink-3)" }}>
                              ({gmailAddr})
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                          {gmailOk
                            ? "Scanning your inbox every 15 min — classifying real replies vs automated"
                            : "Connect Gmail so we automatically detect recruiter replies, interviews, and rejections"}
                        </div>
                      </div>
                    </div>
                    <a
                      href="/api/gmail/auth"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80 flex items-center gap-1.5"
                      style={{
                        background:   gmailOk ? "var(--lime)" : "var(--card)",
                        color:        gmailOk ? "var(--lime-dark)" : "var(--ink-2)",
                        borderColor:  "var(--border)",
                      }}
                    >
                      {gmailOk ? <><Check size={11} /> Connected</> : "Connect"}
                    </a>
                  </div>
                  {gmailOk && (
                    <button
                      onClick={scanNow}
                      disabled={scanning}
                      className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <RefreshCw size={11} className={scanning ? "animate-spin" : ""} />
                      {scanning ? "Scanning inbox..." : "Scan inbox now"}
                    </button>
                  )}
                </div>

                {/* Platform credential cards */}
                {PLATFORMS.map((p) => {
                  const isConnected = connected[p.key];
                  const cf          = credForms[p.key];

                  return (
                    <div
                      key={p.key}
                      className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: "var(--border)", background: "var(--card-off)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{
                              background: isConnected ? "rgba(100,190,80,0.12)" : `${p.color}14`,
                              color:      isConnected ? "#2d6b1a" : p.color,
                            }}
                          >
                            {p.label.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                              {p.label}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                              {p.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConnected && (
                            <button
                              onClick={() => removeCreds(p.key)}
                              className="text-xs px-2 py-1 rounded-lg border transition-all hover:opacity-70"
                              style={{ color: "var(--ink-3)", borderColor: "var(--border)", background: "var(--card)" }}
                            >
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setCredForms((prev) => ({
                                ...prev,
                                [p.key]: { ...prev[p.key], open: !prev[p.key].open },
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80 flex items-center gap-1.5"
                            style={{
                              background:  isConnected ? "var(--lime)" : "var(--card)",
                              color:       isConnected ? "var(--lime-dark)" : "var(--ink-2)",
                              borderColor: "var(--border)",
                            }}
                          >
                            {isConnected ? <><Check size={11} /> Connected</> : "Connect"}
                          </button>
                        </div>
                      </div>

                      {/* Credential form — expands on click */}
                      {cf.open && (
                        <div className="space-y-3 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                            Your credentials are encrypted with AES-256 before storage. The worker logs in as you to submit applications.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-2)" }}>Email</label>
                              <input
                                type="email"
                                value={cf.email}
                                onChange={(e) =>
                                  setCredForms((prev) => ({ ...prev, [p.key]: { ...prev[p.key], email: e.target.value } }))
                                }
                                placeholder={`Your ${p.label.split(" ")[0]} email`}
                                className="w-full px-3 py-2 rounded-xl text-sm outline-none border"
                                style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--ink)" }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-2)" }}>Password</label>
                              <div className="relative">
                                <input
                                  type={cf.show ? "text" : "password"}
                                  value={cf.password}
                                  onChange={(e) =>
                                    setCredForms((prev) => ({ ...prev, [p.key]: { ...prev[p.key], password: e.target.value } }))
                                  }
                                  placeholder="Your password"
                                  className="w-full px-3 py-2 pr-8 rounded-xl text-sm outline-none border"
                                  style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--ink)" }}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCredForms((prev) => ({ ...prev, [p.key]: { ...prev[p.key], show: !prev[p.key].show } }))
                                  }
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                                  style={{ color: "var(--ink-3)" }}
                                >
                                  {cf.show ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => saveCreds(p.key)}
                            disabled={cf.saving || !cf.email || !cf.password}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
                            style={{ background: "var(--ink)", color: "var(--lime)" }}
                          >
                            {cf.saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            {cf.saving ? "Saving..." : "Save credentials"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </>
          )}

          {/* Save — profile + preferences only */}
          {active !== "integrations" && (
            <div className="pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--ink)", color: "var(--lime)" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
