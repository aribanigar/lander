/**
 * Landed — Browser Apply Worker
 *
 * Polls MongoDB for queued applications every 30 seconds.
 * For each, opens a Playwright browser session and submits the application.
 * Runs 2 sessions concurrently (tunable via WORKER_CONCURRENCY env var).
 *
 * Deploy on Oracle Cloud Free Tier or any VPS. Managed by PM2.
 */
import "dotenv/config";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import { connectDB } from "./db";
import { claimBatch, markApplied, markFailed, releaseBack } from "./queue";
import { resumeTextToPdfFile } from "./resume-pdf";
import { routeAndApply } from "./apply-router";
import { startHealthServer, recordApply, recordFailure } from "./health";
import type { BrowserContext } from "playwright";

// Enable stealth mode — hides Playwright fingerprints from bot detection
chromium.use(StealthPlugin());

const POLL_INTERVAL_MS  = 30_000;
const CONCURRENCY       = parseInt(process.env.WORKER_CONCURRENCY ?? "2", 10);

let context: BrowserContext | null = null;

async function getBrowserContext(): Promise<BrowserContext> {
  if (!context) {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",    // prevents crashes on low-memory servers
        "--disable-gpu",
      ],
    });
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/New_York",
      viewport: { width: 1280, height: 800 },
    });
    console.log("[browser] Browser context created");
  }
  return context;
}

async function processOne(item: Awaited<ReturnType<typeof claimBatch>>[number]): Promise<void> {
  const { application, user } = item;
  const appId  = application._id.toString();
  const email  = user.emailNotifications ?? user.email ?? "";

  if (!email) {
    await markFailed(appId, "No email address on user profile");
    return;
  }

  let pdfPath: string | null = null;

  try {
    console.log(`[worker] Processing: ${application.company} — ${application.jobTitle}`);

    // Generate resume PDF
    const resumeText = application.tailoredResumeText ?? "";
    if (!resumeText) {
      await markFailed(appId, "No tailored resume text on application");
      return;
    }

    pdfPath = await resumeTextToPdfFile(resumeText);

    const ctx  = await getBrowserContext();
    const page = await ctx.newPage();

    try {
      const result = await routeAndApply({
        page,
        userId:        application.userId,
        applyUrl:      application.applyUrl ?? application.jobUrl,
        atsType:       application.atsType,
        companySlug:   application.atsCompanySlug,
        jobId:         application.atsJobId,
        fullName:      user.fullName,
        email,
        phone:         user.phone,
        resumeText,
        resumePdfPath: pdfPath,
        coverLetter:   application.coverLetter,
      });

      if (result.success) {
        await markApplied(appId, result.externalId);
        recordApply();
        console.log(`[worker] Applied: ${application.company} (${application.atsType ?? "generic"})`);
      } else {
        await markFailed(appId, result.error ?? "Unknown error");
        recordFailure();
        console.warn(`[worker] Failed: ${application.company} — ${result.error}`);
      }
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Error processing ${application.company}:`, msg);
    await markFailed(appId, msg).catch(() => {});
  } finally {
    if (pdfPath) {
      await fs.unlink(pdfPath).catch(() => {});
    }
  }
}

async function poll(): Promise<void> {
  try {
    const batch = await claimBatch();

    if (batch.length === 0) {
      return; // nothing to do
    }

    console.log(`[worker] Claimed ${batch.length} application(s)`);

    // Process up to CONCURRENCY applications in parallel
    const chunks: typeof batch[] = [];
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      chunks.push(batch.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(chunk.map(processOne));
    }
  } catch (err) {
    // Release any stuck applications if DB fails
    console.error("[worker] Poll error:", err);
  }
}

async function main(): Promise<void> {
  console.log("[worker] Starting Landed apply worker...");

  // Start health server before DB connect so deploy pipeline can check immediately
  startHealthServer(parseInt(process.env.HEALTH_PORT ?? "3001", 10));

  await connectDB();

  // Recover any applications stuck in "processing" from a previous crash
  const { Application } = await import("./db");
  await Application.updateMany({ status: "processing" }, { $set: { status: "queued" } });
  console.log("[worker] Recovered stuck applications");

  // Initial poll then schedule
  await poll();

  setInterval(() => {
    poll().catch((err) => console.error("[worker] Interval poll error:", err));
  }, POLL_INTERVAL_MS);

  console.log(`[worker] Running — polling every ${POLL_INTERVAL_MS / 1000}s`);
}

main().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM — shutting down");
  if (context) await context.browser()?.close().catch(() => {});
  process.exit(0);
});
