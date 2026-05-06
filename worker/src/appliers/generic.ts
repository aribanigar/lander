/**
 * Generic form filler — last-resort for unknown ATS / direct company career pages.
 * Detects common field patterns and fills them. Low success rate but worth attempting.
 */
import { ApplyParams, ApplyResult, delay } from "./types";

export async function applyGeneric(params: ApplyParams): Promise<ApplyResult> {
  const { page, applyUrl, firstName, lastName, fullName, email, phone, resumePdfPath, coverLetter } = params;

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(1500);

    // Try to find and fill name fields (first+last or combined)
    const firstNameInput = page.locator(
      'input[name*="first" i], input[placeholder*="first name" i], input[id*="first" i]'
    ).first();
    const fullNameInput = page.locator(
      'input[name="name"], input[placeholder*="full name" i], input[placeholder*="your name" i]'
    ).first();

    if (await firstNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameInput.fill(firstName);
      await delay(300);
      const lnInput = page.locator('input[name*="last" i], input[placeholder*="last name" i], input[id*="last" i]').first();
      if (await lnInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await lnInput.fill(lastName);
        await delay(300);
      }
    } else if (await fullNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fullNameInput.fill(fullName);
      await delay(300);
    }

    // Email
    const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(email);
      await delay(300);
    }

    // Phone
    if (phone) {
      const phoneInput = page.locator('input[type="tel"], input[name*="phone" i], input[placeholder*="phone" i]').first();
      if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await phoneInput.fill(phone);
        await delay(300);
      }
    }

    // Resume upload
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.setInputFiles(resumePdfPath);
      await delay(2000);
    }

    // Cover letter
    if (coverLetter) {
      const textareaSelectors = [
        'textarea[name*="cover" i]',
        'textarea[placeholder*="cover" i]',
        'textarea[name*="message" i]',
        'textarea[placeholder*="tell us" i]',
        'textarea[placeholder*="additional" i]',
      ];
      for (const selector of textareaSelectors) {
        const ta = page.locator(selector).first();
        if (await ta.isVisible({ timeout: 500 }).catch(() => false)) {
          await ta.fill(coverLetter.slice(0, 2000));
          await delay(300);
          break;
        }
      }
    }

    // Submit — try various patterns
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send")',
    ];
    for (const sel of submitSelectors) {
      const btn = page.locator(sel).last();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await delay(3000);
        break;
      }
    }

    const successCount = await page.locator(
      'text=/thank you|application received|submitted|we.ll be in touch|confirmation/i'
    ).count();

    if (successCount > 0 || page.url().includes("success") || page.url().includes("thank")) {
      return { success: true };
    }

    return { success: false, error: "Generic form fill — could not confirm submission" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
