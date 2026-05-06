/**
 * Workable apply automation
 * URL pattern: https://apply.workable.com/{company}/j/{jobId}/apply
 */
import { ApplyParams, ApplyResult, delay } from "./types";

export async function applyWorkable(params: ApplyParams): Promise<ApplyResult> {
  const { page, companySlug, jobId, firstName, lastName, email, phone, resumePdfPath, coverLetter } = params;

  const applyUrl = `https://apply.workable.com/${companySlug}/j/${jobId}/apply`;

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    // Workable uses React — wait for form to hydrate
    await page.waitForSelector('input[name="firstname"], input[id*="firstname" i]', { timeout: 10_000 });

    // First name
    const firstNameInput = page.locator('input[name="firstname"], input[id*="firstname" i]').first();
    await firstNameInput.fill(firstName);
    await delay(300);

    // Last name
    const lastNameInput = page.locator('input[name="lastname"], input[id*="lastname" i]').first();
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill(lastName);
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

    // Resume upload — Workable has a drag-drop area with hidden file input
    const fileInput = page.locator('input[type="file"][accept*="pdf"], input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.setInputFiles(resumePdfPath);
      await delay(2000);
    }

    // Cover letter (optional text area)
    if (coverLetter) {
      const clInput = page.locator('textarea[name="cover_letter"], textarea[placeholder*="cover" i]').first();
      if (await clInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clInput.fill(coverLetter.slice(0, 2000));
        await delay(400);
      }
    }

    // Workable may have a "Next" button (multi-step) or direct Submit
    const nextOrSubmit = page.locator('button:has-text("Next"), button:has-text("Submit"), button[type="submit"]').last();
    await nextOrSubmit.click();
    await delay(2000);

    // If multi-step, may need another Submit
    const submitBtn2 = page.locator('button:has-text("Submit application"), button[type="submit"]').last();
    if (await submitBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn2.click();
      await delay(3000);
    }

    const successCount = await page.locator(
      'text=/thank you|application submitted|successfully applied|we.ll be in touch/i'
    ).count();

    if (successCount > 0 || page.url().includes("success")) {
      return { success: true };
    }

    return { success: false, error: "Could not confirm Workable submission" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
