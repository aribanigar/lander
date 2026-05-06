/**
 * Indeed Apply automation
 * URL patterns:
 *   https://www.indeed.com/viewjob?jk={jobId}
 *   https://www.indeed.com/applystart?jk={jobId}
 *
 * Flow:
 * 1. Inject stored session cookies
 * 2. Navigate to job
 * 3. Click "Apply now" / "Indeed Apply"
 * 4. Fill multi-step apply form
 * 5. Submit
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Cookie } from "playwright";
import { ApplyParams, ApplyResult, delay } from "./types";

chromium.use(StealthPlugin());

interface IndeedCredentials {
  email:    string;
  password: string;
}

export interface IndeedApplyParams extends ApplyParams {
  credentials?: IndeedCredentials;
  sessionCookies?: Cookie[];
  onCookiesUpdated?: (cookies: Cookie[]) => Promise<void>;
}

async function loginIndeed(ctx: BrowserContext, credentials: IndeedCredentials): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto("https://secure.indeed.com/account/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    // Email step
    const emailInput = page.locator('input[name="__email"], input[type="email"], input[id="ifl-InputFormField-3"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(credentials.email);
      await delay(400);
      const continueBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
      await continueBtn.click();
      await delay(2000);
    }

    // Password step
    const pwInput = page.locator('input[name="__password"], input[type="password"]').first();
    if (await pwInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pwInput.fill(credentials.password);
      await delay(400);
      const signInBtn = page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in")').first();
      await signInBtn.click();
      await delay(4000);
    }

    const url = page.url();
    return !url.includes("login") && !url.includes("auth");
  } catch {
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

export async function applyIndeed(params: IndeedApplyParams): Promise<ApplyResult> {
  const { applyUrl, phone, resumePdfPath, coverLetter, credentials, sessionCookies, onCookiesUpdated } = params;

  // Extract job key
  let jobKey = "";
  try {
    const u = new URL(applyUrl);
    jobKey = u.searchParams.get("jk") ?? u.searchParams.get("vjk") ?? "";
  } catch {
    // URL may not be parseable
  }

  if (!jobKey) {
    return { success: false, error: "Could not extract Indeed job key from URL" };
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/New_York",
    viewport: { width: 1366, height: 768 },
  });

  try {
    if (sessionCookies && sessionCookies.length > 0) {
      await ctx.addCookies(sessionCookies);
    }

    const page = await ctx.newPage();

    // Go to job page
    await page.goto(`https://www.indeed.com/viewjob?jk=${jobKey}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(2000);

    // Check if login required
    if (page.url().includes("login") || page.url().includes("auth")) {
      if (!credentials) {
        return { success: false, error: "Indeed session expired and no credentials stored" };
      }
      const loggedIn = await loginIndeed(ctx, credentials);
      if (!loggedIn) {
        return { success: false, error: "Indeed login failed — check credentials" };
      }
      const freshCookies = await ctx.cookies("https://www.indeed.com");
      if (onCookiesUpdated) await onCookiesUpdated(freshCookies).catch(() => {});

      await page.goto(`https://www.indeed.com/viewjob?jk=${jobKey}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await delay(2000);
    }

    // Find "Apply now" button — redirect to Indeed Apply or external
    const applyBtn = page.locator(
      'button[aria-label*="Apply" i]:not([aria-label*="Save"]), a[aria-label*="Apply" i]:not([aria-label*="Save"]), button:has-text("Apply now"), button:has-text("Indeed Apply")'
    ).first();

    if (!(await applyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return { success: false, error: "Apply button not found on Indeed job page" };
    }

    await applyBtn.click();
    await delay(3000);

    // Handle the multi-step application
    let step = 0;
    const MAX_STEPS = 10;

    while (step < MAX_STEPS) {
      const currentUrl = page.url();

      // Check for success
      if (
        currentUrl.includes("post-apply") ||
        currentUrl.includes("applied") ||
        (await page.locator("text=/application submitted|successfully applied|application received/i").count()) > 0
      ) {
        return { success: true };
      }

      // Resume upload
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileInput.setInputFiles(resumePdfPath);
        await delay(3000);
      }

      // Phone
      const phoneInput = page.locator('input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]').first();
      if (phone && await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const val = await phoneInput.inputValue().catch(() => "");
        if (!val) {
          await phoneInput.fill(phone);
          await delay(300);
        }
      }

      // Cover letter
      if (coverLetter) {
        const cl = page.locator('textarea[name*="cover" i], textarea[placeholder*="cover" i], textarea[aria-label*="cover" i]').first();
        if (await cl.isVisible({ timeout: 1000 }).catch(() => false)) {
          const val = await cl.inputValue().catch(() => "");
          if (!val) {
            await cl.fill(coverLetter.slice(0, 3000));
            await delay(400);
          }
        }
      }

      // Yes/No questions — pick "Yes" by default
      const yesRadios = page.locator('label:has-text("Yes") input[type="radio"], input[type="radio"][value="Yes" i], input[type="radio"][value="yes"]');
      const yesCount = await yesRadios.count();
      for (let i = 0; i < Math.min(yesCount, 3); i++) {
        const r = yesRadios.nth(i);
        if (await r.isVisible({ timeout: 500 }).catch(() => false)) {
          await r.check().catch(() => {});
          await delay(200);
        }
      }

      // Continue / Next / Submit
      const submitBtn = page.locator(
        'button[type="submit"]:has-text("Submit"), button:has-text("Submit my application"), button[aria-label*="Submit"]'
      ).first();
      const nextBtn = page.locator(
        'button[type="submit"]:has-text("Continue"), button:has-text("Next"), button[data-testid*="submit"], button[type="submit"]'
      ).first();

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

    // Final check
    const confirmed = (await page.locator("text=/application submitted|successfully applied|application received/i").count()) > 0;
    if (confirmed || page.url().includes("post-apply") || page.url().includes("applied")) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm Indeed application submission" };

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser.close().catch(() => {});
  }
}
