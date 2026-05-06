"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Globe2, FileText, BarChart3, Bell, Shield,
  ArrowRight, CheckCircle2, Target, TrendingUp, Mail
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Niche job discovery",
    desc: "Finds the highest-signal job postings across LinkedIn, Indeed, Adzuna and 15+ boards — filtered to your exact field and seniority.",
  },
  {
    icon: FileText,
    title: "ATS-beating resumes",
    desc: "Claude AI reads the job description, extracts the keywords ATS systems flag on, and writes a tailored resume that gets through automated screening.",
  },
  {
    icon: Zap,
    title: "Bulk apply — daily",
    desc: "Applies to 20–50 positions per day on your behalf. Each application includes a custom cover letter that argues your case specifically.",
  },
  {
    icon: BarChart3,
    title: "Full pipeline tracking",
    desc: "Tracks every application: applied → viewed → replied → interview → offer. No spreadsheet needed.",
  },
  {
    icon: Bell,
    title: "Smart reply detection",
    desc: "Distinguishes real recruiter interest from auto-rejection. You only get notified when it matters.",
  },
  {
    icon: Globe2,
    title: "Live application globe",
    desc: "Watch your applications land at companies worldwide in real time on an interactive 3D globe.",
  },
];

const stats = [
  { value: "3×", label: "more interviews vs manual" },
  { value: "60", label: "days median to offer" },
  { value: "50+", label: "applications per day" },
  { value: "100%", label: "real data, no demos" },
];

const steps = [
  { step: "01", title: "Tell us who you are", desc: "5-minute onboarding. Your field, experience, salary target, and what you actually want to work on." },
  { step: "02", title: "Upload or build your resume", desc: "Upload your existing CV or answer our questions and we'll build one from scratch — ATS-optimised from day one." },
  { step: "03", title: "Set your loop running", desc: "We discover matching jobs daily, tailor your resume per application, and apply in bulk — automatically." },
  { step: "04", title: "Track everything, miss nothing", desc: "See your full pipeline. Get notified only on genuine recruiter interest. Book interviews directly." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Landed" className="h-7 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium px-4 py-1.5 rounded-lg bg-[#cce832] text-[#1a1e16] hover:opacity-90 transition-opacity font-mono"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 pb-28 px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#cce832]/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#cce832]/[0.03] blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto relative"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/50 font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cce832] animate-pulse" />
            Now applying to real jobs in real time
          </div>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-[-2px] leading-[1.05] mb-6">
            Land your next job<br />
            <span className="text-[#cce832]">60× faster.</span>
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-10">
            Landed finds companies hiring in your niche, tailors your resume to each job description,
            and applies in bulk — daily. Built for senior professionals who value their time.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#cce832] text-[#1a1e16] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Start landing interviews
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/20 transition-all"
            >
              Already have an account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-white/[0.06] py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold font-mono text-[#cce832] tracking-tight mb-1">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-[#cce832]/70 uppercase tracking-widest mb-4">Everything included</div>
            <h2 className="text-4xl font-semibold tracking-[-1px]">
              Your AI job-hunting engine
            </h2>
            <p className="text-white/40 mt-3 text-base max-w-md mx-auto">
              Every feature works together. No bolt-ons. No manual steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#cce832]/10 flex items-center justify-center mb-4 group-hover:bg-[#cce832]/15 transition-colors">
                  <f.icon size={17} className="text-[#cce832]" />
                </div>
                <h3 className="font-semibold text-[15px] mb-2 text-white/90">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-[#cce832]/70 uppercase tracking-widest mb-4">How it works</div>
            <h2 className="text-4xl font-semibold tracking-[-1px]">Up and running in 5 minutes</h2>
          </div>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.step} className="flex gap-8 pb-12 relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-px bg-white/[0.06]" />
                )}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center font-mono text-xs text-white/30 bg-white/[0.02]">
                  {s.step}
                </div>
                <div className="pt-1.5">
                  <h3 className="font-semibold text-[16px] mb-2 text-white/90">{s.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTIFICATION PREVIEW */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#cce832]/20 bg-[#cce832]/[0.04] text-xs text-[#cce832]/70 font-mono mb-8">
            <Mail size={12} />
            Smart notifications
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.8px] mb-4">
            Only hear from us when it matters
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-md mx-auto">
            We classify every reply — auto-responses, rejections, and genuine recruiter interest.
            You only get notified when a real human wants to talk.
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-left space-y-3">
            {[
              { type: "positive", company: "Ogilvy", role: "Sr Art Director", msg: "We loved your portfolio — are you available Thursday?" },
              { type: "interview", company: "Droga5", role: "Brand Designer", msg: "Interview confirmed · Thu Apr 11 · 10:00 AM GMT" },
              { type: "rejected", company: "BBDO", role: "Creative Lead", msg: "Auto-rejection detected · Filtered from your inbox" },
            ].map((n) => (
              <div
                key={n.company}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  n.type === "positive"
                    ? "border-[#64be50]/20 bg-[#64be50]/[0.04]"
                    : n.type === "interview"
                    ? "border-[#cce832]/20 bg-[#cce832]/[0.04]"
                    : "border-white/[0.04] bg-white/[0.02] opacity-40"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  n.type === "positive" ? "bg-[#64be50]" : n.type === "interview" ? "bg-[#cce832]" : "bg-white/20"
                }`} />
                <div>
                  <div className="text-xs font-mono text-white/40 mb-0.5">{n.company} · {n.role}</div>
                  <div className="text-sm text-white/70">{n.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-mono text-[#cce832]/70 uppercase tracking-widest mb-4">Simple pricing</div>
          <h2 className="text-4xl font-semibold tracking-[-1px] mb-3">One goal: get you hired</h2>
          <p className="text-white/40 text-sm mb-16">No annual contracts. Cancel anytime.</p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Starter",
                price: "$29",
                period: "/mo",
                desc: "For dipping your toes in.",
                features: ["10 applications / day", "ATS resume tailoring", "Pipeline tracking", "Email notifications"],
                cta: "Start free trial",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$79",
                period: "/mo",
                desc: "For serious job seekers.",
                features: ["50 applications / day", "Everything in Starter", "LinkedIn integration", "Reply classification AI", "Globe view", "Priority support"],
                cta: "Start free trial",
                highlight: true,
              },
              {
                name: "Unlimited",
                price: "$149",
                period: "/mo",
                desc: "Maximum firepower.",
                features: ["Unlimited applications", "Everything in Pro", "Multi-niche campaigns", "Dedicated account manager", "Custom email domain"],
                cta: "Contact us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-2xl border text-left ${
                  plan.highlight
                    ? "border-[#cce832]/30 bg-[#cce832]/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {plan.highlight && (
                  <div className="text-2xs font-mono text-[#cce832] mb-3 uppercase tracking-widest">Most popular</div>
                )}
                <div className="font-semibold text-white/90 mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-3xl font-bold font-mono text-white">{plan.price}</span>
                  <span className="text-white/30 text-sm">{plan.period}</span>
                </div>
                <div className="text-xs text-white/30 mb-5">{plan.desc}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <CheckCircle2 size={13} className={plan.highlight ? "text-[#cce832]" : "text-white/20"} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85 ${
                    plan.highlight
                      ? "bg-[#cce832] text-[#1a1e16]"
                      : "border border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-[#cce832]" />
            <span className="text-sm text-white/40 font-mono">Senior professionals land in &lt; 60 days</span>
          </div>
          <h2 className="text-5xl font-semibold tracking-[-1.5px] mb-4">
            Ready to get<br />
            <span className="text-[#cce832]">Landed?</span>
          </h2>
          <p className="text-white/40 text-sm mb-8">Takes 5 minutes to set up. Works while you sleep.</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#cce832] text-[#1a1e16] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Landed" className="h-5 w-auto opacity-50" />
          </div>
          <div className="text-xs text-white/20 font-mono">
            &copy; {new Date().getFullYear()} Landed. Built for senior professionals.
          </div>
          <div className="flex gap-4 text-xs text-white/30">
            <Link href="#" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
