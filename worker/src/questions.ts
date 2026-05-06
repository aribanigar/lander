/**
 * AI-powered custom question answering for job application forms.
 * Uses Claude Haiku (fast + cheap) to answer free-text questions
 * that can't be answered with simple pattern matching.
 *
 * Common question types handled without AI (to save tokens):
 * - Years of experience → uses user's yearsExp field
 * - Salary expectations → uses user's salary range
 * - Notice period / start date → "2 weeks"
 * - Work authorization / visa → "Yes"
 * - Relocation → "Open to discussion"
 */
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export interface QuestionContext {
  candidateName:  string;
  candidateNiche: string;
  yearsExp:       number;
  jobTitle:       string;
  company:        string;
  salaryMin?:     number;
  salaryMax?:     number;
  currency?:      string;
}

/**
 * Answer a single free-text or short-answer question from a job application form.
 * Returns a concise, contextual answer string.
 */
export async function answerQuestion(question: string, ctx: QuestionContext): Promise<string> {
  const q = question.toLowerCase().trim();

  // ── Pattern-matched answers (no AI needed) ───────────────────────────────

  // Years of experience
  if (/years?\s*(of\s*)?(experience|exp)/i.test(q)) {
    return String(ctx.yearsExp ?? 10);
  }

  // Salary
  if (/salary|compensation|expected pay|pay expectation|ctc/i.test(q)) {
    if (ctx.salaryMin && ctx.salaryMax) {
      const sym = ctx.currency ?? "";
      return `${sym}${ctx.salaryMin.toLocaleString()}–${sym}${ctx.salaryMax.toLocaleString()} per year`;
    }
    return "Negotiable — open to discussing the full package";
  }

  // Notice period / start date
  if (/notice period|start date|when.*available|how soon|joining date/i.test(q)) {
    return "I can join with 2 weeks notice";
  }

  // Work authorization / visa sponsorship
  if (/authorized|eligible to work|work permit|require.*sponsor|visa/i.test(q)) {
    return "Yes";
  }

  // Relocation
  if (/relocat/i.test(q)) {
    return "Open to relocation — happy to discuss";
  }

  // Remote / hybrid
  if (/remote|hybrid|on.?site|in.?office/i.test(q)) {
    return "I am flexible and happy to discuss the working arrangement";
  }

  // Reference check
  if (/reference|referral/i.test(q)) {
    return "References available upon request";
  }

  // LinkedIn / website
  if (/linkedin/i.test(q)) {
    return "Available on request";
  }

  // ── Claude Haiku for everything else ─────────────────────────────────────
  try {
    const ai  = getClient();
    const msg = await ai.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{
        role:    "user",
        content: `Answer this job application question in 1–2 concise sentences. Write only the answer — no prefix, no quotes.

Question: "${question}"

Applicant context:
- Name: ${ctx.candidateName}
- Applying for: ${ctx.jobTitle} at ${ctx.company}
- Background: ${ctx.candidateNiche}
- Years experience: ${ctx.yearsExp ?? "10+"}`,
      }],
    });

    const block = msg.content[0];
    if (block.type === "text") return block.text.trim();
  } catch (err) {
    console.warn("[questions] Claude call failed:", err instanceof Error ? err.message : err);
  }

  // Fallback
  return "Please refer to my resume for full details.";
}

/**
 * Fill a visible text input or textarea on the page using AI.
 * Only calls answerQuestion if the field appears to be a custom question
 * (not name / email / phone / address — those are handled by the applier directly).
 */
export function isCustomQuestion(label: string): boolean {
  const skip = /name|email|phone|mobile|address|city|zip|postal|country|state|linkedin|website|url|upload|resume|cv/i;
  return !skip.test(label) && label.trim().length > 3;
}
