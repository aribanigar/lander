/**
 * Ashby HQ apply automation
 * URL pattern: https://jobs.ashbyhq.com/{company}/{jobId}/application
 */
import { ApplyParams, ApplyResult, delay } from "./types";

export async function applyAshby(params: ApplyParams): Promise<ApplyResult> {
  const { page, companySlug, jobId, firstName, lastName, email, phone, resumePdfPath, coverLetter } = params;

  const applyUrl = `https://jobs.ashbyhq.com/${companySlug}/${jobId}/application`;

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    // Ashby is React — wait for form
    await page.waitForSelector('input[placeholder*="First" i], input[name*="firstName" i], input[id*="first" i]', {
      timeout: 10_000,
    });

    // First name
    const fnInput = page.locator('input[placeholder*="First" i], input[name*="firstName" i]').first();
    if (await fnInput.isVisible()) {
      await fnInput.fill(firstName);
      await delay(300);
    }

    // Last name
    const lnInput = page.locator('input[placeholder*="Last" i], input[name*="lastName" i]').first();
    if (await lnInput.isVisible()) {
      await lnInput.fill(lastName);
      await delay(300);
    }

    // Email
    const emailInput = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await delay(300);
    }

    // Phone
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="Phone" i]').first();
    if (phone && await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill(phone);
      await delay(300);
    }

    // Resume upload
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.setInputFiles(resumePdfPath);
      await delay(2000);
    }

    // Cover letter
    if (coverLetter) {
      const clArea = page.locator('textarea[placeholder*="cover" i], textarea[placeholder*="additional" i]').first();
      if (await clArea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clArea.fill(coverLetter.slice(0, 2000));
        await delay(400);
      }
    }

    // Submit
    const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]').last();
    await submitBtn.click();
    await delay(3000);

    const successCount = await page.locator(
      'text=/application submitted|thank you|we.ve received|successfully/i'
    ).count();

    if (successCount > 0 || page.url().includes("confirmation")) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm Ashby submission" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
