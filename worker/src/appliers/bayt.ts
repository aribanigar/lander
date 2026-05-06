/**
 * Bayt.com Apply automation (Middle East)
 * URL pattern: https://www.bayt.com/en/{country}/jobs/{job-slug}-{jobId}/
 *
 * Flow:
 * 1. Inject stored session cookies
 * 2. Navigate to job
 * 3. Click "Apply" button
 * 4. Fill application form (cover letter, answers)
 * 5. Submit
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Cookie } from "playwright";
import { ApplyParams, ApplyResult, delay } from "./types";

chromium.use(StealthPlugin());

interface BaytCredentials {
  email:    string;
  password: string;
}

export interface BaytApplyParams extends ApplyParams {
  credentials?: BaytCredentials;
  sessionCookies?: Cookie[];
  onCookiesUpdated?: (cookies: Cookie[]) => Promise<void>;
}

async function loginBayt(ctx: BrowserContext, credentials: BaytCredentials): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto("https://www.bayt.com/en/user/login/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    const emailInput = page.locator('input[name="login_name"], input[type="email"], input[placeholder*="Email" i]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(credentials.email);
      await delay(400);
    }

    const pwInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await pwInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pwInput.fill(credentials.password);
      await delay(400);
    }

    const loginBtn = page.locator('input[type="submit"][value*="Login" i], button[type="submit"]:has-text("Login"), button:has-text("Sign in")').first();
    await loginBtn.click();
    await delay(4000);

    const url = page.url();
    return url.includes("bayt.com") && !url.includes("login") && !url.includes("signin");
  } catch {
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

export async function applyBayt(params: BaytApplyParams): Promise<ApplyResult> {
  const { applyUrl, credentials, sessionCookies, onCookiesUpdated, coverLetter } = params;

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Asia/Dubai",
    viewport: { width: 1366, height: 768 },
  });

  try {
    if (sessionCookies && sessionCookies.length > 0) {
      await ctx.addCookies(sessionCookies);
    }

    const page = await ctx.newPage();

    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(2000);

    // Check if redirected to login
    if (page.url().includes("login") || page.url().includes("signin")) {
      if (!credentials) {
        return { success: false, error: "Bayt session expired and no credentials stored" };
      }
      const loggedIn = await loginBayt(ctx, credentials);
      if (!loggedIn) {
        return { success: false, error: "Bayt login failed — check credentials" };
      }
      const freshCookies = await ctx.cookies("https://www.bayt.com");
      if (onCookiesUpdated) await onCookiesUpdated(freshCookies).catch(() => {});
      await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await delay(2000);
    }

    // Find Apply button
    const applyBtn = page.locator(
      'a:has-text("Apply for Job"), a:has-text("Apply Now"), button:has-text("Apply"), a[href*="apply"]'
    ).first();

    if (!(await applyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return { success: false, error: "Apply button not found on Bayt job page" };
    }

    await applyBtn.click();
    await delay(3000);

    // Bayt application page
    let step = 0;
    const MAX_STEPS = 5;

    while (step < MAX_STEPS) {
      const url = page.url();

      // Success detection
      if (
        url.includes("application-sent") ||
        url.includes("applied") ||
        url.includes("success") ||
        (await page.locator("text=/application has been sent|applied successfully|thank you for applying/i").count()) > 0
      ) {
        return { success: true };
      }

      // Cover letter / message field
      if (coverLetter) {
        const cl = page.locator(
          'textarea[name*="cover" i], textarea[id*="cover" i], textarea[placeholder*="cover" i], textarea[name="message"]'
        ).first();
        if (await cl.isVisible({ timeout: 1000 }).catch(() => false)) {
          const val = await cl.inputValue().catch(() => "");
          if (!val) {
            await cl.fill(coverLetter.slice(0, 3000));
            await delay(400);
          }
        }
      }

      // Answer screening questions — default to first radio/select option
      const radios = page.locator('input[type="radio"]');
      const radioCount = await radios.count();
      for (let i = 0; i < Math.min(radioCount, 5); i++) {
        const r = radios.nth(i);
        if (await r.isVisible({ timeout: 500 }).catch(() => false)) {
          const checked = await r.isChecked().catch(() => false);
          if (!checked) {
            await r.check().catch(() => {});
            await delay(200);
          }
        }
      }

      // Submit / Next
      const submitBtn = page.locator(
        'input[type="submit"][value*="Submit" i], input[type="submit"][value*="Apply" i], button[type="submit"]:has-text("Submit"), button:has-text("Apply")'
      ).first();
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();

      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
        await delay(4000);
        break;
      } else if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await delay(2000);
        step++;
      } else {
        break;
      }
    }

    const confirmed = (await page.locator("text=/application has been sent|applied successfully|thank you for applying/i").count()) > 0;
    if (confirmed || page.url().includes("application-sent") || page.url().includes("applied")) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm Bayt application submission" };

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser.close().catch(() => {});
  }
}
