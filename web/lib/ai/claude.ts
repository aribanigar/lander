import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "claude-opus-4.6";

/* ─────────────────────────────────────────────────────── */
/* EXTRACT JOB KEYWORDS                                    */
/* ─────────────────────────────────────────────────────── */
const keywordsSchema = z.object({
  required:         z.array(z.string()),
  niceToHave:       z.array(z.string()),
  atsKeywords:      z.array(z.string()),
  senioritySignals: z.array(z.string()),
});

export async function extractJobKeywords(description: string) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: keywordsSchema }),
    prompt: `You are an ATS system analyst. Extract keywords from this job description.

- required: hard requirements
- niceToHave: preferred but not mandatory
- atsKeywords: exact phrases an ATS system scans for (include job title, tools, certs)
- senioritySignals: phrases indicating expected seniority level

JOB DESCRIPTION:
${description}`,
  });

  return output;
}

/* ─────────────────────────────────────────────────────── */
/* TAILOR RESUME FOR A SPECIFIC JOB                        */
/* ─────────────────────────────────────────────────────── */
const tailorSchema = z.object({
  tailoredResume:   z.string(),
  atsScore:         z.number().min(0).max(100),
  keywordsInjected: z.array(z.string()),
  coverLetter:      z.string(),
});

export async function tailorResume(params: {
  userProfile: {
    fullName: string;
    field: string;
    role: string;
    yearsExp: number;
    niche: string;
  };
  masterResumeText: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  atsKeywords: string[];
}) {
  const { userProfile, masterResumeText, jobTitle, company, jobDescription, atsKeywords } = params;

  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: tailorSchema }),
    maxOutputTokens: 4096,
    prompt: `You are a world-class ATS resume writer and career coach. Tailor this senior professional's resume to pass ATS screening AND impress the hiring manager.

CANDIDATE PROFILE:
- Name: ${userProfile.fullName}
- Field: ${userProfile.field}
- Targeting: ${jobTitle} at ${company}
- Years of experience: ${userProfile.yearsExp}
- Niche: ${userProfile.niche}

MASTER RESUME:
${masterResumeText}

TARGET JOB DESCRIPTION:
${jobDescription}

ATS KEYWORDS TO INJECT NATURALLY:
${atsKeywords.join(", ")}

RULES:
1. NEVER fabricate experience or skills not in the master resume
2. Reframe existing experience to match this JD — never invent
3. Inject ATS keywords naturally — not as a keyword dump
4. Lead with impact: quantified achievements, not responsibilities
5. Summary must open with WHY this person is the best candidate for THIS role specifically
6. Use the exact job title in the summary and first experience bullet
7. Mirror the language and tone of the job description

Cover letter rules:
- Open with the single strongest reason this candidate should be hired
- 3 paragraphs max — concise but impactful
- Directly address what the company is looking for
- End with a specific, confident call to action
- NEVER use "I am writing to apply" or "Please find attached"`,
  });

  return output;
}

/* ─────────────────────────────────────────────────────── */
/* CLASSIFY EMAIL REPLY                                    */
/* ─────────────────────────────────────────────────────── */
const replySchema = z.object({
  classification:         z.enum(["positive","rejection","automated","neutral","interview_invite"]),
  confidence:             z.number().min(0).max(1),
  isAutomatic:            z.boolean(),
  sentiment:              z.enum(["positive","negative","neutral"]),
  urgency:                z.enum(["high","medium","low"]),
  reason:                 z.string(),
  extractedInterviewDate: z.string().nullable(),
  extractedInterviewLink: z.string().nullable(),
});

export async function classifyEmailReply(params: {
  subject: string;
  body: string;
  company: string;
  jobTitle: string;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: replySchema }),
    prompt: `You are an expert recruiter email analyst. Classify this reply to a job application.

CONTEXT:
- Company: ${params.company}
- Applied role: ${params.jobTitle}
- Email subject: ${params.subject}

EMAIL BODY:
${params.body}

Classifications:
- interview_invite: they want to schedule a call/interview
- positive: genuine human interest, no interview booked yet
- rejection: explicit or implicit rejection
- automated: clearly an auto-response (no-reply, ATS notification)
- neutral: follow-up, status update, or unclear

urgency: high = needs response today · medium = within 48h · low = FYI
extractedInterviewDate: e.g. "Thursday April 11 at 10am GMT" — null if not present
extractedInterviewLink: zoom/meet link — null if not present`,
  });

  return output;
}

/* ─────────────────────────────────────────────────────── */
/* BUILD MASTER RESUME FROM PROFILE ANSWERS                */
/* ─────────────────────────────────────────────────────── */
export async function buildMasterResume(
  profileAnswers: Record<string, string>
): Promise<string> {
  const { text } = await generateText({
    model: anthropic(MODEL),
    maxOutputTokens: 3000,
    prompt: `You are a professional resume writer specialising in senior creative and design professionals.

Build a complete, ATS-optimised master resume in markdown from these profile answers.
Use action verbs — never start bullets with "I".
Focus on achievements and impact, not responsibilities.
Include: Professional Summary · Core Skills · Experience (reverse chrono) · Education · Awards/Recognition.

PROFILE ANSWERS:
${JSON.stringify(profileAnswers, null, 2)}

Return only the resume in clean markdown. No preamble.`,
  });

  return text;
}

/* ─────────────────────────────────────────────────────── */
/* GENERATE WARM OUTREACH MESSAGE                         */
/* ─────────────────────────────────────────────────────── */
const outreachSchema = z.object({
  subject:        z.string(),    // for email subject / linkedin opener
  message:        z.string(),    // the full message
  toneNote:       z.string(),    // brief note on why this tone was chosen
});

export async function generateOutreachMessage(params: {
  senderName:     string;
  senderNiche:    string;
  senderYearsExp: number;
  company:        string;
  jobTitle:       string;
  contactName?:   string;
  contactTitle?:  string;
  platform:       "linkedin" | "email";
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: outreachSchema }),
    prompt: `You are a world-class career coach who writes outreach messages that actually get replies.
Write a warm, human outreach message from ${params.senderName} to a ${params.contactTitle ?? "team member"} at ${params.company}.

SENDER PROFILE:
- Name: ${params.senderName}
- Niche: ${params.senderNiche}
- Years of experience: ${params.senderYearsExp}

TARGET:
- Company: ${params.company}
- Role being applied for: ${params.jobTitle}
- Contact name: ${params.contactName ?? "not known — write generically"}
- Contact title: ${params.contactTitle ?? "team member"}
- Platform: ${params.platform}

RULES:
- ${params.platform === "linkedin" ? "Max 300 characters. LinkedIn has strict limits. Be brief, warm, specific." : "Max 150 words. Professional but human."}
- Never start with "I am reaching out to"
- Reference WHY this person / company specifically
- One specific reason why the sender is a strong fit
- Clear, soft call to action (no "please let me know if you're interested")
- Sound like a human, not a template
- NEVER mention salary or compensation
- subject: 5-8 words, no "Application for..." format`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* GENERATE FOLLOW-UP EMAIL SEQUENCE                      */
/* ─────────────────────────────────────────────────────── */
const followUpSchema = z.object({
  subject: z.string(),
  body:    z.string(),
});

export async function generateFollowUp(params: {
  senderName:  string;
  senderNiche: string;
  company:     string;
  jobTitle:    string;
  dayNumber:   3 | 7 | 14;
  appliedAt:   string;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: followUpSchema }),
    prompt: `Write a follow-up email for a job application. This is day ${params.dayNumber} follow-up.

CONTEXT:
- Sender: ${params.senderName} (${params.senderNiche})
- Company: ${params.company}
- Role: ${params.jobTitle}
- Applied: ${params.appliedAt}
- Day ${params.dayNumber} follow-up

TONE GUIDE BY DAY:
- Day 3: Warm confirmation check — "Just wanted to make sure my application came through correctly"
- Day 7: Add value — reference something recent about the company or share a relevant insight/achievement
- Day 14: Final gentle nudge — acknowledge they're busy, restate your interest, offer to provide more info

RULES:
- Max 80 words in the body
- Never sound desperate or pushy
- No "I'm just checking in" — be more specific
- Subject line: conversational, not formal
- Body: start with something other than "I"
- End with a very low-commitment call to action`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* SCORE GHOST JOB PROBABILITY                            */
/* ─────────────────────────────────────────────────────── */
const ghostScoreSchema = z.object({
  score:       z.number().min(0).max(100), // 0 = definitely real, 100 = definitely ghost
  label:       z.enum(["likely_real", "uncertain", "likely_ghost"]),
  reasons:     z.array(z.string()),        // short reasons why
  recommendation: z.string(),             // what to do
});

export async function scoreGhostJob(params: {
  jobTitle:       string;
  company:        string;
  postedDaysAgo:  number;
  description:    string;
  salary?:        string;
  repostCount?:   number;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: ghostScoreSchema }),
    prompt: `You are a job market analyst. Assess whether this is a "ghost job" (posted but not actively hiring).

JOB:
- Title: ${params.jobTitle}
- Company: ${params.company}
- Posted: ${params.postedDaysAgo} days ago
- Reposted: ${params.repostCount ?? 0} times
- Salary listed: ${params.salary ?? "none"}
- Description length: ${params.description.length} chars

DESCRIPTION EXCERPT:
${params.description.slice(0, 600)}

GHOST JOB SIGNALS (use these to score):
- Posted 45+ days ago with no changes → +30 ghost score
- Reposted 2+ times → +25
- No salary listed → +10
- Extremely vague description → +20
- Title is very generic (e.g. "Sales Representative") → +10
- Fortune 500 HR-speak with no specifics → +15
- Specific tech stack / deliverables mentioned → -30 (real jobs are specific)
- Salary listed → -20 (ghost jobs rarely list salary)

reasons: 2-3 bullet reasons for your score
recommendation: one sentence on what to apply with or whether to skip`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* GENERATE INTERVIEW PREP BRIEFING                       */
/* ─────────────────────────────────────────────────────── */
const prepSchema = z.object({
  companyOverview:    z.string(),     // 2-3 sentences about the company
  likelyQuestions:    z.array(z.string()), // 6-8 questions they'll probably ask
  suggestedAnswers:   z.array(z.object({ question: z.string(), guidance: z.string() })),
  redFlags:           z.array(z.string()), // things to watch out for / ask about
  smartQuestions:     z.array(z.string()), // questions the candidate should ask
  salaryAnchor:       z.string(),     // recommended salary anchor tactic
  closingAdvice:      z.string(),     // one-sentence mindset tip
});

export async function generateInterviewPrep(params: {
  company:        string;
  jobTitle:       string;
  jobDescription: string;
  candidateName:  string;
  candidateNiche: string;
  interviewType:  string;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: prepSchema }),
    maxOutputTokens: 3000,
    prompt: `You are a top executive career coach preparing a candidate for a job interview.

INTERVIEW:
- Company: ${params.company}
- Role: ${params.jobTitle}
- Type: ${params.interviewType}
- Candidate: ${params.candidateName} — ${params.candidateNiche}

JOB DESCRIPTION:
${params.jobDescription.slice(0, 1200)}

Prepare a comprehensive briefing. Be specific — no generic advice.
likelyQuestions: questions THIS company in THIS industry typically asks for THIS role level
suggestedAnswers: pick the 3 trickiest questions and give a guidance note (not a full script)
redFlags: specific things about this company/role to probe — glassdoor-style watch-outs
smartQuestions: 5 questions that will make the candidate look exceptional
salaryAnchor: based on the role and market, how should they handle compensation discussion`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* DETECT HIRING SIGNALS FROM COMPANY DATA                */
/* ─────────────────────────────────────────────────────── */
const signalsSchema = z.object({
  signals: z.array(z.object({
    signalType:   z.enum(["funding","headcount_growth","exec_hire","mass_hire","new_office","product_launch"]),
    description:  z.string(),
    strength:     z.enum(["strong","medium","weak"]),
    confidence:   z.number().min(0).max(100),
  })),
  overallHiringLikelihood: z.enum(["high","medium","low"]),
  reasoning: z.string(),
});

export async function detectHiringSignals(params: {
  company:         string;
  openJobCount:    number;
  recentJobTitles: string[];
  companySize?:    string;
  foundedYear?:    number;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: signalsSchema }),
    prompt: `You are a hiring intelligence analyst. Assess whether this company is in active hiring mode.

COMPANY DATA:
- Name: ${params.company}
- Open jobs right now: ${params.openJobCount}
- Company size: ${params.companySize ?? "unknown"}
- Founded: ${params.foundedYear ?? "unknown"}

RECENT JOB POSTINGS (titles):
${params.recentJobTitles.slice(0, 20).join("\n")}

Based on the job posting patterns, identify hiring signals. A company posting senior leadership + individual contributor roles simultaneously = exec_hire + headcount_growth. Multiple roles in same department = mass_hire.

Be specific in descriptions — include numbers where you can infer them.`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* RESPONSE PATTERN INTELLIGENCE                          */
/* ─────────────────────────────────────────────────────── */
const insightSchema = z.object({
  topInsight:      z.string(),    // the single most important finding
  insights:        z.array(z.object({ finding: z.string(), action: z.string() })),
  winningPattern:  z.string(),    // describe what IS working
  weakestLink:     z.string(),    // biggest drop-off in funnel
  weeklyTarget:    z.string(),    // specific advice for this week
});

export async function generateResponseInsights(stats: {
  totalApplied: number;
  totalViewed: number;
  totalReplied: number;
  totalInterview: number;
  replyRate: number;
  avgAts: number | null;
  topCompanySizes: string[];
  topIndustries: string[];
  topStatuses: Record<string, number>;
}) {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: insightSchema }),
    prompt: `You are a career analytics expert reviewing a job seeker's application data.

FUNNEL DATA:
- Applied: ${stats.totalApplied}
- Viewed: ${stats.totalViewed} (${stats.totalApplied > 0 ? Math.round((stats.totalViewed/stats.totalApplied)*100) : 0}%)
- Replied: ${stats.totalReplied} (${stats.replyRate}%)
- Interviews: ${stats.totalInterview}
- Avg ATS score: ${stats.avgAts ?? "unknown"}

Top company sizes: ${stats.topCompanySizes.join(", ") || "mixed"}
Top industries: ${stats.topIndustries.join(", ") || "mixed"}

Give 3-5 specific, data-driven insights with concrete actions.
weakestLink: where in the funnel do they lose most candidates
weeklyTarget: one specific change they should make THIS week`,
  });
  return output;
}

/* ─────────────────────────────────────────────────────── */
/* JOB OFFER PROBABILITY PREDICTION                       */
/* ─────────────────────────────────────────────────────── */
const offerPredictionSchema = z.object({
  oneMonth:          z.number().min(0).max(100),   // % chance of offer within 30 days
  twoMonths:         z.number().min(0).max(100),   // % chance within 60 days
  threeMonths:       z.number().min(0).max(100),   // % chance within 90 days
  expectedOfferDate: z.string(),                   // e.g. "Late May 2026" or "8–10 weeks"
  searchHealthScore: z.number().min(0).max(100),   // overall search health 0–100
  confidence:        z.enum(["low", "medium", "high"]),
  keyFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(["positive", "negative", "neutral"]),
    detail: z.string(),
  })),
  recommendations:   z.array(z.string()),          // 3–5 specific things to do now
  summary:           z.string(),                   // 2–3 sentence plain-English summary
});

export type OfferPrediction = z.infer<typeof offerPredictionSchema>;

export async function predictOfferProbability(params: {
  // Profile
  field:            string;
  seniority:        string;
  yearsExp:         number;
  salaryMin:        number;
  salaryMax:        number;
  currency:         string;
  remotePreference: string;
  // Search stats
  daysActive:       number;
  totalApplied:     number;
  totalViewed:      number;
  totalReplied:     number;
  totalInterview:   number;
  totalRejected:    number;
  totalOffers:      number;
  dailyVelocity:    number;   // avg apps/day over last 30 days
  avgAtsScore:      number | null;
  replyRate:        number;   // 0–100
  interviewRate:    number;   // 0–100
  platformCount:    number;   // number of different job sources used
  currentDate:      string;   // ISO date
}): Promise<OfferPrediction> {
  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: offerPredictionSchema }),
    prompt: `You are a senior career analytics expert and data scientist specialising in job market predictions.
Analyse this job seeker's search data and produce a calibrated probability model for receiving a job offer.

CANDIDATE PROFILE:
- Field / industry: ${params.field || "Not specified"}
- Seniority level: ${params.seniority || "Senior"}
- Years of experience: ${params.yearsExp}
- Salary expectation: ${params.currency}${params.salaryMin}–${params.currency}${params.salaryMax}
- Remote preference: ${params.remotePreference}

JOB SEARCH STATS (as of ${params.currentDate}):
- Search duration: ${params.daysActive} days active
- Total applications: ${params.totalApplied}
- Viewed by recruiter: ${params.totalViewed}
- Replies received: ${params.totalReplied} (${params.replyRate}% reply rate)
- Interviews: ${params.totalInterview} (${params.interviewRate}% of applied)
- Rejections: ${params.totalRejected}
- Offers: ${params.totalOffers}
- Daily velocity: ${params.dailyVelocity.toFixed(1)} applications/day (last 30 days)
- Avg ATS score: ${params.avgAtsScore ?? "unknown"}/100
- Job platforms used: ${params.platformCount}

INDUSTRY BENCHMARKS (use for calibration):
- Average cold application-to-reply rate: 5–8%
- Average reply-to-interview rate: 40–60%
- Average interview-to-offer rate: 20–30%
- Overall application-to-offer rate: 1–3%
- Senior roles (8+ yrs exp) typically take 8–14 weeks longer than junior
- Strong ATS score (>75) can double reply rate
- 15+ apps/day typically reaches an offer within 6–8 weeks at median conversion rates

PREDICTION RULES:
1. oneMonth/twoMonths/threeMonths: cumulative probability. threeMonths must be ≥ twoMonths ≥ oneMonth.
2. If 0 applications, all probabilities = 0.
3. If they already have an offer, probabilities should reflect imminent success.
4. Be realistic — don't inflate. A 5% reply rate with 3 interviews is not a 90% chance in 1 month.
5. searchHealthScore: 0 = catastrophic, 50 = average, 80+ = strong. Factor in velocity, ATS, reply rate.
6. keyFactors: 3–5 specific factors from their data (positive and negative), ordered by impact magnitude.
7. recommendations: concrete, specific actions — not generic advice. Reference their actual numbers.
8. expectedOfferDate: give a real calendar estimate ("Mid June 2026") based on current pace.
9. confidence: low if <10 apps, medium if 10–50, high if 50+.
10. summary: 2–3 sentences, honest and motivating.`,
  });

  return output;
}

/* ─────────────────────────────────────────────────────── */
/* PREDICT JOB SEARCH TIMELINE (legacy — kept for compat) */
/* ─────────────────────────────────────────────────────── */
const timelineSchema = z.object({
  replyRate:            z.number(),
  interviewRate:        z.number(),
  projectedDaysToOffer: z.number(),
  confidence:           z.enum(["high","medium","low"]),
  recommendation:       z.string(),
});

export async function predictTimeline(stats: {
  daysActive: number;
  totalApplied: number;
  totalReplied: number;
  totalInterviews: number;
  totalOffers: number;
  dailyAverage: number;
}) {
  const replyRate     = stats.totalApplied > 0 ? stats.totalReplied   / stats.totalApplied : 0;
  const interviewRate = stats.totalApplied > 0 ? stats.totalInterviews / stats.totalApplied : 0;

  const { output } = await generateText({
    model: anthropic(MODEL),
    output: Output.object({ schema: timelineSchema }),
    prompt: `You are a career analytics expert. Predict when this job seeker will receive an offer.

STATS:
- Days active: ${stats.daysActive}
- Total applied: ${stats.totalApplied}
- Replies: ${stats.totalReplied} (${(replyRate * 100).toFixed(1)}%)
- Interviews: ${stats.totalInterviews} (${(interviewRate * 100).toFixed(1)}%)
- Offers: ${stats.totalOffers}
- Daily average applications: ${stats.dailyAverage}

recommendation: one specific, actionable sentence to improve their chances.`,
  });

  return output;
}
