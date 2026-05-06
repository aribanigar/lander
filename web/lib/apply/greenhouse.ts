const GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards";

export interface GreenhouseCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeText: string;
  coverLetter?: string;
}

export interface GreenhouseApplyParams {
  boardToken: string;
  jobId: string;
  candidate: GreenhouseCandidate;
}

export interface GreenhouseApplyResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

export async function applyViaGreenhouse(
  params: GreenhouseApplyParams
): Promise<GreenhouseApplyResult> {
  const { boardToken, jobId, candidate } = params;

  if (!boardToken || !jobId) {
    return { success: false, error: "boardToken and jobId are required" };
  }

  if (!candidate.firstName || !candidate.lastName || !candidate.email) {
    return { success: false, error: "firstName, lastName, and email are required" };
  }

  const url = `${GREENHOUSE_BASE}/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobId)}/applications`;

  const body = new FormData();
  body.append("first_name", candidate.firstName);
  body.append("last_name", candidate.lastName);
  body.append("email", candidate.email);

  if (candidate.phone) {
    body.append("phone", candidate.phone);
  }

  if (candidate.resumeText) {
    body.append("resume_text", candidate.resumeText);
  }

  if (candidate.coverLetter) {
    body.append("cover_letter_text", candidate.coverLetter);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();

    if (!res.ok) {
      let errorMessage = `Greenhouse API returned ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.errors) {
          errorMessage = Array.isArray(parsed.errors)
            ? parsed.errors.map((e: { message?: string } | string) =>
                typeof e === "string" ? e : (e.message ?? JSON.stringify(e))
              ).join("; ")
            : String(parsed.errors);
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        errorMessage = text || errorMessage;
      }
      return { success: false, error: errorMessage };
    }

    let applicationId: string | undefined;
    try {
      const parsed = JSON.parse(text);
      applicationId =
        parsed.id != null ? String(parsed.id) : parsed.application_id != null ? String(parsed.application_id) : undefined;
    } catch {
      // Response may not be JSON on success — treat as success regardless
    }

    return { success: true, applicationId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
