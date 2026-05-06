import type { Page } from "playwright";
import type { Cookie } from "playwright";
import type { ApplyParams, ApplyResult } from "./appliers/types";
import { applyLever }         from "./appliers/lever";
import { applyWorkable }      from "./appliers/workable";
import { applyAshby }         from "./appliers/ashby";
import { applySmartRecruiters } from "./appliers/smartrecruiters";
import { applyGeneric }       from "./appliers/generic";
import { applyLinkedIn,  type LinkedInApplyParams  } from "./appliers/linkedin";
import { applyIndeed,    type IndeedApplyParams    } from "./appliers/indeed";
import { applyNaukri,    type NaukriApplyParams    } from "./appliers/naukri";
import { applyBayt,      type BaytApplyParams      } from "./appliers/bayt";
import { decryptJSON }        from "./encrypt";
import { User }               from "./db";

interface RouteInput {
  page:          Page;
  userId:        string;
  applyUrl:      string;
  atsType?:      string | null;
  companySlug?:  string;
  jobId?:        string;
  fullName:      string;
  email:         string;
  phone?:        string;
  resumeText:    string;
  resumePdfPath: string;
  coverLetter?:  string;
}

type PlatformKey = "linkedin" | "indeed" | "naukri" | "bayt";

const SESSION_FIELD: Record<PlatformKey, "linkedinSession" | "indeedSession" | "naukriSession" | "baytSession"> = {
  linkedin: "linkedinSession",
  indeed:   "indeedSession",
  naukri:   "naukriSession",
  bayt:     "baytSession",
};
const CREDS_FIELD: Record<PlatformKey, "linkedinCreds" | "indeedCreds" | "naukriCreds" | "baytCreds"> = {
  linkedin: "linkedinCreds",
  indeed:   "indeedCreds",
  naukri:   "naukriCreds",
  bayt:     "baytCreds",
};
const SESSION_UPDATED_FIELD: Record<PlatformKey, "linkedinSessionUpdatedAt" | "indeedSessionUpdatedAt" | "naukriSessionUpdatedAt" | "baytSessionUpdatedAt"> = {
  linkedin: "linkedinSessionUpdatedAt",
  indeed:   "indeedSessionUpdatedAt",
  naukri:   "naukriSessionUpdatedAt",
  bayt:     "baytSessionUpdatedAt",
};

/** Fetch + decrypt stored credentials and session cookies for a platform */
async function getPlatformAuth(userId: string, platform: PlatformKey): Promise<{
  credentials?: { email: string; password: string };
  sessionCookies?: Cookie[];
  onCookiesUpdated: (cookies: Cookie[]) => Promise<void>;
}> {
  const userDoc = await User.findOne({ clerkId: userId })
    .select(`${CREDS_FIELD[platform]} ${SESSION_FIELD[platform]} ${SESSION_UPDATED_FIELD[platform]}`);

  let credentials: { email: string; password: string } | undefined;
  let sessionCookies: Cookie[] | undefined;

  if (userDoc) {
    const rawCreds = userDoc[CREDS_FIELD[platform]];
    if (rawCreds) {
      try { credentials = decryptJSON(rawCreds as string); } catch { /* ignore */ }
    }

    const rawSession = userDoc[SESSION_FIELD[platform]];
    const updatedAt  = userDoc[SESSION_UPDATED_FIELD[platform]] as Date | undefined;
    const SESSION_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days

    if (rawSession && updatedAt && Date.now() - updatedAt.getTime() < SESSION_TTL_MS) {
      try { sessionCookies = decryptJSON(rawSession as string); } catch { /* ignore */ }
    }
  }

  const onCookiesUpdated = async (cookies: Cookie[]) => {
    const { encryptJSON } = await import("./encrypt");
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          [SESSION_FIELD[platform]]:         encryptJSON(cookies),
          [SESSION_UPDATED_FIELD[platform]]: new Date(),
        },
      }
    );
  };

  return { credentials, sessionCookies, onCookiesUpdated };
}

export async function routeAndApply(input: RouteInput): Promise<ApplyResult> {
  const nameParts = input.fullName.split(" ");
  const firstName = nameParts[0] ?? "Applicant";
  const lastName  = nameParts.slice(1).join(" ") || ".";

  const base: ApplyParams = {
    page:          input.page,
    applyUrl:      input.applyUrl,
    companySlug:   input.companySlug ?? "",
    jobId:         input.jobId ?? "",
    fullName:      input.fullName,
    firstName,
    lastName,
    email:         input.email,
    phone:         input.phone,
    resumeText:    input.resumeText,
    resumePdfPath: input.resumePdfPath,
    coverLetter:   input.coverLetter,
  };

  switch (input.atsType) {
    // ── ATS platforms (browser-based) ────────────────────────────────────────
    case "lever":           return applyLever(base);
    case "workable":        return applyWorkable(base);
    case "ashby":           return applyAshby(base);
    case "smartrecruiters": return applySmartRecruiters(base);

    // ── Job portals (session-based) ───────────────────────────────────────────
    case "linkedin": {
      const auth = await getPlatformAuth(input.userId, "linkedin");
      const p: LinkedInApplyParams = { ...base, ...auth };
      return applyLinkedIn(p);
    }
    case "indeed": {
      const auth = await getPlatformAuth(input.userId, "indeed");
      const p: IndeedApplyParams = { ...base, ...auth };
      return applyIndeed(p);
    }
    case "naukri": {
      const auth = await getPlatformAuth(input.userId, "naukri");
      const p: NaukriApplyParams = { ...base, ...auth };
      return applyNaukri(p);
    }
    case "bayt": {
      const auth = await getPlatformAuth(input.userId, "bayt");
      const p: BaytApplyParams = { ...base, ...auth };
      return applyBayt(p);
    }

    default:
      return applyGeneric(base);
  }
}
