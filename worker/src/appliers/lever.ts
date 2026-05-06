/**
 * Lever.co apply automation
 * URL pattern: https://jobs.lever.co/{company}/{jobId}/apply
 */
import { ApplyParams, ApplyResult, delay } from "./types";

export async function applyLever(params: ApplyParams): Promise<ApplyResult> {
  const { page, companySlug, jobId, fullName, email, phone, resumePdfPath, coverLetter } = params;

  const applyUrl = `https://jobs.lever.co/${companySlug}/${jobId}/apply`;

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1000);

    // Full name
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(fullName);
      await delay(400);
    }

    // Email
    const emailInput = page.locator('input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await delay(300);
    }

    // Phone
    const phoneInput = page.locator('input[name="phone"]').first();
    if (phone && await phoneInput.isVisible()) {
      await phoneInput.fill(phone);
      await delay(300);
    }

    // Resume upload
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.setInputFiles(resumePdfPath);
      await delay(1500);
    }

    // Cover letter / additional comments
    if (coverLetter) {
      const textarea = page.locator(
        'textarea[name="comments"], textarea[placeholder*="cover" i], textarea[placeholder*="additional" i]'
      ).first();
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.fill(coverLetter.slice(0, 2000));
        await delay(400);
      }
    }

    // LinkedIn URL field (common on Lever — fill with placeholder to satisfy required)
    const linkedinInput = page.locator('input[name="urls[LinkedIn]"], input[placeholder*="linkedin" i]').first();
    if (await linkedinInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await linkedinInput.fill("https://linkedin.com/in/applicant");
      await delay(200);
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').last();
    await submitBtn.click();
    await delay(3000);

    // Success detection
    const currentUrl = page.url();
    const successCount = await page.locator(
      'text=/thank you|application received|successfully submitted|we.ll be in touch/i'
    ).count();

    if (
      successCount > 0 ||
      currentUrl.includes("confirmation") ||
      currentUrl.includes("success") ||
      currentUrl.includes("thank")
    ) {
      return { success: true };
    }

    // Check for error messages
    const errorCount = await page.locator('.error, [class*="error"], [role="alert"]').count();
    if (errorCount > 0) {
      const errorText = await page.locator('.error, [class*="error"]').first().textContent();
      return { success: false, error: errorText?.trim() ?? "Form error" };
    }

    return { success: false, error: "Could not confirm submission — no success indicator found" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
