/**
 * LinkedIn Easy Apply automation
 * URL pattern: https://www.linkedin.com/jobs/view/{jobId}
 *
 * Flow:
 * 1. Inject stored session cookies into a fresh browser context
 * 2. Navigate to the job page
 * 3. Click "Easy Apply"
 * 4. Fill the multi-step modal (contact info, resume, custom questions)
 * 5. Submit
 * 6. If session expired → log in fresh with credentials, update cookies in DB
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Cookie } from "playwright";
import { ApplyParams, ApplyResult, delay } from "./types";
import { answerQuestion, isCustomQuestion } from "../questions";

chromium.use(StealthPlugin());

interface LinkedInCredentials {
  email:    string;
  password: string;
}

export interface LinkedInApplyParams extends ApplyParams {
  credentials?: LinkedInCredentials;
  sessionCookies?: Cookie[];
  onCookiesUpdated?: (cookies: Cookie[]) => Promise<void>;
  // AI question context
  candidateNiche?: string;
  yearsExp?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
}

async function loginLinkedIn(ctx: BrowserContext, credentials: LinkedInCredentials): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1000);

    await page.fill('input[name="session_key"]',      credentials.email);
    await delay(400);
    await page.fill('input[name="session_password"]', credentials.password);
    await delay(400);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // Check if we're past the login page
    const url = page.url();
    return url.includes("linkedin.com/feed") || url.includes("linkedin.com/in/") || !url.includes("login");
  } catch {
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

export async function applyLinkedIn(params: LinkedInApplyParams): Promise<ApplyResult> {
  const {
    applyUrl, fullName, email, phone, resumePdfPath, coverLetter,
    credentials, sessionCookies, onCookiesUpdated,
    candidateNiche = "", yearsExp = 10, salaryMin, salaryMax, currency = "",
  } = params;

  const qCtx = {
    candidateName: fullName, candidateNiche,
    yearsExp, jobTitle: "", company: "", salaryMin, salaryMax, currency,
  };

  // Extract job ID from URL
  const jobIdMatch = applyUrl.match(/\/jobs\/view\/(\d+)/);
  if (!jobIdMatch) {
    return { success: false, error: "Could not extract LinkedIn job ID from URL" };
  }
  const jobId = jobIdMatch[1];

  // Create isolated browser context for this session
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
    viewport: { width: 1366, height: 768 },
  });

  try {
    // Inject stored cookies
    if (sessionCookies && sessionCookies.length > 0) {
      await ctx.addCookies(sessionCookies);
    }

    const page = await ctx.newPage();

    // Navigate to job
    await page.goto(
      `https://www.linkedin.com/jobs/view/${jobId}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 }
    );
    await delay(2000);

    // Check if redirected to login — session expired
    if (page.url().includes("linkedin.com/login") || page.url().includes("authwall")) {
      if (!credentials) {
        return { success: false, error: "LinkedIn session expired and no credentials stored" };
      }

      // Log in fresh
      const loggedIn = await loginLinkedIn(ctx, credentials);
      if (!loggedIn) {
        return { success: false, error: "LinkedIn login failed — check credentials" };
      }

      // Save fresh cookies back to DB
      const freshCookies = await ctx.cookies("https://www.linkedin.com");
      if (onCookiesUpdated) {
        await onCookiesUpdated(freshCookies).catch(() => {});
      }

      // Navigate again
      await page.goto(
        `https://www.linkedin.com/jobs/view/${jobId}`,
        { waitUntil: "domcontentloaded", timeout: 30_000 }
      );
      await delay(2000);
    }

    // Find and click Easy Apply button
    const easyApplyBtn = page.locator(
      'button[aria-label*="Easy Apply" i], button:has-text("Easy Apply")'
    ).first();

    if (!(await easyApplyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return { success: false, error: "Easy Apply button not found — job may require external application" };
    }

    await easyApplyBtn.click();
    await delay(2000);

    // Fill the multi-step modal
    let step = 0;
    const MAX_STEPS = 8;

    while (step < MAX_STEPS) {
      // Check if modal is still open
      const modal = page.locator('[data-test-modal-id="easy-apply-modal"], .jobs-easy-apply-modal, [aria-labelledby*="easy-apply"]').first();
      if (!(await modal.isVisible({ timeout: 3000 }).catch(() => false))) {
        break; // Modal closed — likely submitted
      }

      // Phone number field
      const phoneField = modal.locator('input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]').first();
      if (phone && await phoneField.isVisible({ timeout: 1000 }).catch(() => false)) {
        const current = await phoneField.inputValue().catch(() => "");
        if (!current) {
          await phoneField.fill(phone);
          await delay(300);
        }
      }

      // Resume upload
      const fileInput = modal.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileInput.setInputFiles(resumePdfPath);
        await delay(2000);
      }

      // Cover letter / additional info textarea
      if (coverLetter) {
        const textarea = modal.locator(
          'textarea[name*="cover" i], textarea[placeholder*="cover" i], textarea[placeholder*="additional" i], textarea[aria-label*="cover" i]'
        ).first();
        if (await textarea.isVisible({ timeout: 1000 }).catch(() => false)) {
          await textarea.fill(coverLetter.slice(0, 3000));
          await delay(400);
        }
      }

      // ── AI-powered custom text/textarea questions ──────────────────────
      const textInputs = modal.locator('input[type="text"]:not([autocomplete="email"]):not([autocomplete="tel"]):not([name*="name" i]):not([name*="phone" i]):not([name*="email" i])');
      const textCount  = await textInputs.count();
      for (let i = 0; i < Math.min(textCount, 6); i++) {
        const inp = textInputs.nth(i);
        if (!(await inp.isVisible({ timeout: 500 }).catch(() => false))) continue;
        const val = await inp.inputValue().catch(() => "");
        if (val) continue; // already filled

        // Get the label for this input
        const id    = await inp.getAttribute("id").catch(() => "");
        const label = id
          ? await modal.locator(`label[for="${id}"]`).textContent().catch(() => "") ?? ""
          : await inp.getAttribute("aria-label").catch(() => "") ?? "";

        if (label && isCustomQuestion(label)) {
          const answer = await answerQuestion(label, { ...qCtx, jobTitle: qCtx.jobTitle || "this role" }).catch(() => "");
          if (answer) { await inp.fill(answer); await delay(300); }
        }
      }

      // Handle multiple choice / radio / select custom questions
      // Yes/No questions — default to first option
      const radios = modal.locator('input[type="radio"]:first-of-type');
      const radioCount = await radios.count();
      for (let i = 0; i < Math.min(radioCount, 5); i++) {
        const radio = radios.nth(i);
        if (await radio.isVisible({ timeout: 500 }).catch(() => false)) {
          const checked = await radio.isChecked().catch(() => false);
          if (!checked) {
            await radio.check().catch(() => {});
            await delay(200);
          }
        }
      }

      // Handle select dropdowns
      const selects = modal.locator("select");
      const selectCount = await selects.count();
      for (let i = 0; i < Math.min(selectCount, 5); i++) {
        const sel = selects.nth(i);
        if (await sel.isVisible({ timeout: 500 }).catch(() => false)) {
          const val = await sel.inputValue().catch(() => "");
          if (!val || val === "") {
            const options = sel.locator("option");
            const optCount = await options.count();
            if (optCount > 1) {
              // Pick second option (first is usually blank/placeholder)
              const firstVal = await options.nth(1).getAttribute("value").catch(() => "");
              if (firstVal) await sel.selectOption(firstVal).catch(() => {});
              await delay(200);
            }
          }
        }
      }

      // Check for "Next", "Continue", "Review", "Submit" buttons
      const submitBtn = modal.locator(
        'button[aria-label*="Submit application" i], button:has-text("Submit application")'
      ).first();
      const nextBtn = modal.locator(
        'button[aria-label*="Continue to next step" i], button:has-text("Next"), button:has-text("Continue"), button[aria-label*="Review" i], button:has-text("Review")'
      ).first();

      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
        await delay(3000);
        break;
      } else if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await delay(1500);
        step++;
      } else {
        // No navigation button found — check for success or break
        break;
      }
    }

    // Verify success — check for confirmation modal or toast
    const successMsg = await page.locator(
      'text=/application submitted|your application was sent|successfully applied/i, [data-test-modal-id="easy-apply-success-modal"]'
    ).count();

    if (successMsg > 0) {
      return { success: true };
    }

    // Check if modal is gone (submitted and closed)
    const modalGone = !(await page.locator(
      '[data-test-modal-id="easy-apply-modal"], .jobs-easy-apply-modal'
    ).isVisible({ timeout: 2000 }).catch(() => false));

    if (modalGone) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm application submission" };

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser.close().catch(() => {});
  }
}
