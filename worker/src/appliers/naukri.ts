/**
 * Naukri.com Apply automation (India)
 * URL pattern: https://www.naukri.com/job-listings-{slug}?jobId={id}
 *
 * Flow:
 * 1. Inject stored session cookies
 * 2. Navigate to job page
 * 3. Click "Apply" button
 * 4. Handle Naukri's single-step / quick-apply modal
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Cookie } from "playwright";
import { ApplyParams, ApplyResult, delay } from "./types";

chromium.use(StealthPlugin());

interface NaukriCredentials {
  email:    string;
  password: string;
}

export interface NaukriApplyParams extends ApplyParams {
  credentials?: NaukriCredentials;
  sessionCookies?: Cookie[];
  onCookiesUpdated?: (cookies: Cookie[]) => Promise<void>;
}

async function loginNaukri(ctx: BrowserContext, credentials: NaukriCredentials): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto("https://www.naukri.com/nlogin/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    const emailInput = page.locator('input[placeholder*="Email" i], input[name="username"], input[id="usernameField"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(credentials.email);
      await delay(400);
    }

    const pwInput = page.locator('input[type="password"], input[placeholder*="Password" i]').first();
    if (await pwInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pwInput.fill(credentials.password);
      await delay(400);
    }

    const loginBtn = page.locator('button[type="submit"]:has-text("Login"), button:has-text("Login"), input[type="submit"]').first();
    await loginBtn.click();
    await delay(4000);

    const url = page.url();
    return url.includes("naukri.com") && !url.includes("login");
  } catch {
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

export async function applyNaukri(params: NaukriApplyParams): Promise<ApplyResult> {
  const { applyUrl, phone, resumePdfPath, coverLetter, credentials, sessionCookies, onCookiesUpdated } = params;

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1366, height: 768 },
  });

  try {
    if (sessionCookies && sessionCookies.length > 0) {
      await ctx.addCookies(sessionCookies);
    }

    const page = await ctx.newPage();

    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(2000);

    // Check if login wall appeared
    if (page.url().includes("login") || (await page.locator('text="Login to apply"').count()) > 0) {
      if (!credentials) {
        return { success: false, error: "Naukri session expired and no credentials stored" };
      }
      const loggedIn = await loginNaukri(ctx, credentials);
      if (!loggedIn) {
        return { success: false, error: "Naukri login failed — check credentials" };
      }
      const freshCookies = await ctx.cookies("https://www.naukri.com");
      if (onCookiesUpdated) await onCookiesUpdated(freshCookies).catch(() => {});
      await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await delay(2000);
    }

    // Find Apply button
    const applyBtn = page.locator(
      'button:has-text("Apply"), a:has-text("Apply"), button[id*="apply" i], button[class*="apply" i]'
    ).first();

    if (!(await applyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return { success: false, error: "Apply button not found on Naukri job page" };
    }

    await applyBtn.click();
    await delay(2500);

    // Naukri often shows a quick-apply popup or redirects to an apply page
    // Handle the apply form / modal
    let step = 0;
    const MAX_STEPS = 6;

    while (step < MAX_STEPS) {
      const url = page.url();

      // Success detection
      if (
        url.includes("apply-success") ||
        url.includes("applied-successfully") ||
        (await page.locator("text=/application submitted|applied successfully|your application has been sent/i").count()) > 0
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
      const phoneInput = page.locator('input[placeholder*="Mobile" i], input[placeholder*="Phone" i], input[name*="phone" i]').first();
      if (phone && await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const val = await phoneInput.inputValue().catch(() => "");
        if (!val) {
          await phoneInput.fill(phone);
          await delay(300);
        }
      }

      // Cover letter
      if (coverLetter) {
        const cl = page.locator(
          'textarea[placeholder*="cover" i], textarea[placeholder*="message" i], textarea[name*="cover" i]'
        ).first();
        if (await cl.isVisible({ timeout: 1000 }).catch(() => false)) {
          const val = await cl.inputValue().catch(() => "");
          if (!val) {
            await cl.fill(coverLetter.slice(0, 2000));
            await delay(400);
          }
        }
      }

      // Apply / Submit / Next
      const submitBtn = page.locator(
        'button:has-text("Submit"), button:has-text("Apply now"), button[type="submit"]:has-text("Apply")'
      ).first();
      const nextBtn = page.locator(
        'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
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

    const confirmed = (await page.locator("text=/application submitted|applied successfully|application has been sent/i").count()) > 0;
    if (confirmed || page.url().includes("apply-success")) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm Naukri application submission" };

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await browser.close().catch(() => {});
  }
}
