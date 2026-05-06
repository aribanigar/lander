import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Landed",
  description: "How Landed collects, uses, and protects your personal data.",
};

const EFFECTIVE_DATE = "1 May 2025";
const CONTACT_EMAIL  = "privacy@hudace.com";
const APP_NAME       = "Landed";
const COMPANY_NAME   = "Hudace Ltd";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Landed" className="h-6 w-auto" />
          </Link>
          <Link
            href="/sign-in"
            className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs font-mono text-white/40 mb-6">
            Effective {EFFECTIVE_DATE}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-1.5px] leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            {COMPANY_NAME} operates {APP_NAME} (&quot;the Service&quot;). This policy explains what
            data we collect, why we collect it, how we protect it, and your rights as a user.
          </p>
        </div>

        <div className="space-y-10 text-white/75 leading-relaxed">

          {/* 1 */}
          <Section title="1. Who we are">
            <p>
              {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides {APP_NAME}, an
              automated job-search and application platform accessible at{" "}
              <span className="font-mono text-white/60">landed.hudace.com</span>. Questions or
              requests relating to this policy should be directed to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#cce832] hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Data we collect">
            <SubSection label="Account and profile data">
              When you create an account we collect your name, email address, professional field,
              target job title, years of experience, seniority level, job preferences, salary
              range, target locations, and your self-described niche. This is used solely to
              personalise job discovery and tailor application materials.
            </SubSection>

            <SubSection label="Resume data">
              If you upload a resume we store the file and extract its text content. If you build
              a resume through the platform we store the structured content you provide. Resume
              text is passed to our AI provider (Anthropic Claude) to produce tailored versions
              per application — it is not used to train any AI model.
            </SubSection>

            <SubSection label="Platform credentials (optional)">
              If you choose to connect job platforms (LinkedIn, Indeed, Naukri, Bayt), you may
              provide login credentials. These are encrypted end-to-end using AES-256-GCM before
              being stored. We never store credentials in plain text and they are only decrypted
              inside the browser-automation worker at the moment of use.
            </SubSection>

            <SubSection label="Gmail integration (optional)">
              If you connect Gmail, we store an OAuth refresh token (encrypted, never your
              password) and scan your inbox for application-related emails — rejections,
              interview invites, and recruiter replies. We read only emails relevant to your job
              search; we do not read, index, or store unrelated mail.
            </SubSection>

            <SubSection label="Application and activity data">
              We record every job application made on your behalf: company, job title, URL,
              application status, ATS score, and the tailored resume and cover letter used. This
              data is yours and is visible in your pipeline dashboard.
            </SubSection>

            <SubSection label="Usage data">
              We collect standard server logs — IP address, browser type, pages visited, and
              timestamps — for security monitoring and debugging. We do not sell this data or use
              it for advertising.
            </SubSection>
          </Section>

          {/* 3 */}
          <Section title="3. How we use your data">
            <ul className="space-y-2 list-none">
              {[
                "Discovering and scoring job listings that match your profile",
                "Generating tailored resumes and cover letters via AI for each application",
                "Submitting applications to job platforms on your behalf",
                "Tracking application status by scanning your connected Gmail inbox",
                "Sending email notifications about application activity (if enabled)",
                "Improving the relevance of job matching over time",
                "Complying with legal obligations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#cce832] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We never sell your data to third parties. We never use your resume or personal data
              to train AI models.
            </p>
          </Section>

          {/* 4 */}
          <Section title="4. Third-party services">
            <p className="mb-4">
              The Service relies on the following sub-processors. Each is bound by its own privacy
              policy and applicable data protection law.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-6 font-medium text-white/40 text-xs uppercase tracking-wider">Provider</th>
                    <th className="text-left py-2 pr-6 font-medium text-white/40 text-xs uppercase tracking-wider">Purpose</th>
                    <th className="text-left py-2 font-medium text-white/40 text-xs uppercase tracking-wider">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {[
                    ["Clerk",     "Authentication & session management", "Email, name"],
                    ["MongoDB Atlas", "Primary database", "All user and application data"],
                    ["Anthropic (Claude)", "Resume tailoring & keyword extraction", "Resume text, job description"],
                    ["Resend",    "Transactional email notifications", "Email address, application summary"],
                    ["Apollo.io", "Recruiter contact enrichment", "Company name (no personal data)"],
                    ["Adzuna / JSearch", "Job discovery", "Search query (field, location — no personal data)"],
                    ["Vercel",    "Hosting & serverless compute", "HTTP request data, logs"],
                  ].map(([provider, purpose, shared]) => (
                    <tr key={provider}>
                      <td className="py-2.5 pr-6 font-mono text-xs text-white/60">{provider}</td>
                      <td className="py-2.5 pr-6 text-sm">{purpose}</td>
                      <td className="py-2.5 text-sm text-white/50">{shared}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 5 */}
          <Section title="5. Data security">
            <p>
              We apply industry-standard security measures including:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "AES-256-GCM encryption for all stored platform credentials and OAuth tokens",
                "TLS 1.3 in transit for all API and database connections",
                "Clerk-managed authentication with short-lived session tokens",
                "Field-level select: false on sensitive database fields — credentials are never returned in general queries",
                "Environment variables for all secrets — never committed to source control",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#cce832]/60 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4">
              No system is perfectly secure. In the event of a data breach that is likely to result
              in risk to your rights or freedoms, we will notify you and any applicable supervisory
              authority within 72 hours of becoming aware.
            </p>
          </Section>

          {/* 6 */}
          <Section title="6. Data retention">
            <p>
              We retain your account data for as long as your account is active. If you delete your
              account, we delete your profile, credentials, and resume data within 30 days. Anonymised
              aggregate statistics (application counts, ATS score distributions) may be retained
              indefinitely with no link to your identity.
            </p>
            <p className="mt-3">
              Application records and Gmail scan history are retained for 2 years from creation to
              allow you to refer back to your job-search history.
            </p>
          </Section>

          {/* 7 */}
          <Section title="7. Your rights">
            <p className="mb-3">
              Depending on your jurisdiction, you may have some or all of the following rights:
            </p>
            <ul className="space-y-2 list-none">
              {[
                { right: "Access", desc: "Request a copy of all personal data we hold about you." },
                { right: "Rectification", desc: "Correct inaccurate or incomplete data." },
                { right: "Erasure", desc: "Request deletion of your account and all associated personal data." },
                { right: "Restriction", desc: "Ask us to stop processing certain data while a dispute is resolved." },
                { right: "Portability", desc: "Receive your data in a machine-readable format." },
                { right: "Objection", desc: "Object to processing based on legitimate interests or direct marketing." },
                { right: "Withdraw consent", desc: "Withdraw any consent you have previously given at any time." },
              ].map(({ right, desc }) => (
                <li key={right} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#cce832]/60 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-white/90">{right}:</span>{" "}
                    {desc}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#cce832] hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with
              your local data protection authority.
            </p>
          </Section>

          {/* 8 */}
          <Section title="8. Cookies">
            <p>
              We use a single session cookie (<span className="font-mono text-white/60">__landed_ob</span>)
              to track whether you have completed onboarding. This cookie does not contain personal
              data, is not used for tracking or advertising, and expires in 5 years or when you delete
              your account.
            </p>
            <p className="mt-3">
              Clerk may set additional authentication cookies required to maintain your login session.
              These are essential cookies and cannot be disabled without breaking the Service.
            </p>
          </Section>

          {/* 9 */}
          <Section title="9. Children">
            <p>
              The Service is not directed at anyone under the age of 16. We do not knowingly collect
              personal data from children. If you believe a child has provided us with personal data,
              contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#cce832] hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will delete it promptly.
            </p>
          </Section>

          {/* 10 */}
          <Section title="10. International transfers">
            <p>
              Your data is primarily stored in MongoDB Atlas clusters in the US and EU regions, and
              processed on Vercel infrastructure globally. Where data is transferred outside of the
              EEA, we rely on Standard Contractual Clauses or adequacy decisions to ensure
              appropriate protection.
            </p>
          </Section>

          {/* 11 */}
          <Section title="11. Changes to this policy">
            <p>
              We may update this policy from time to time. When we make material changes we will
              notify you by email (if you have notifications enabled) and update the effective date
              at the top of this page. Continued use of the Service after the update constitutes
              acceptance of the revised policy.
            </p>
          </Section>

          {/* 12 */}
          <Section title="12. Contact">
            <p>
              For any privacy-related questions, requests, or complaints:
            </p>
            <div className="mt-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] font-mono text-sm text-white/60 space-y-1">
              <div>{COMPANY_NAME}</div>
              <div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#cce832] hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div>landed.hudace.com</div>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-white/25 font-mono">
            &copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Home
            </Link>
            <Link href="/sign-in" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </main>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3 tracking-tight">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pl-4 border-l border-white/10">
      <div className="text-sm font-medium text-white/80 mb-1">{label}</div>
      <p className="text-sm">{children}</p>
    </div>
  );
}
