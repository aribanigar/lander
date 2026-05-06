/**
 * SmartRecruiters apply automation
 * URL pattern: https://jobs.smartrecruiters.com/{company}/{jobId}
 * Apply button leads to modal or dedicated apply page.
 */
import { ApplyParams, ApplyResult, delay } from "./types";

export async function applySmartRecruiters(params: ApplyParams): Promise<ApplyResult> {
  const { page, companySlug, jobId, firstName, lastName, email, phone, resumePdfPath } = params;

  const listingUrl = `https://jobs.smartrecruiters.com/${companySlug}/${jobId}`;

  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1000);

    // Click the Apply button
    const applyBtn = page.locator('a:has-text("Apply"), button:has-text("Apply")').first();
    if (await applyBtn.isVisible({ timeout: 5000 })) {
      await applyBtn.click();
      await delay(2000);
    }

    // SmartRecruiters often opens in the same page or a new tab
    // Wait for the application form
    await page.waitForSelector('input[name="firstName"], input[placeholder*="First" i]', { timeout: 10_000 });

    // First name
    const fnInput = page.locator('input[name="firstName"], input[placeholder*="First" i]').first();
    if (await fnInput.isVisible()) {
      await fnInput.fill(firstName);
      await delay(300);
    }

    // Last name
    const lnInput = page.locator('input[name="lastName"], input[placeholder*="Last" i]').first();
    if (await lnInput.isVisible()) {
      await lnInput.fill(lastName);
      await delay(300);
    }

    // Email
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await delay(300);
    }

    // Phone
    const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
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

    // Next / Submit
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]').last();
    await nextBtn.click();
    await delay(2000);

    // Final submit if multi-step
    const finalSubmit = page.locator('button:has-text("Submit"), button:has-text("Send application")').last();
    if (await finalSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finalSubmit.click();
      await delay(3000);
    }

    const successCount = await page.locator(
      'text=/thank you|application sent|successfully submitted|we.ll be in touch/i'
    ).count();

    if (successCount > 0) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm SmartRecruiters submission" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
