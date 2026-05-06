/**
 * Lightweight HTTP health-check server.
 * Runs on port 3001 alongside the apply worker.
 * GET /health → { status, uptime, pid, ts }
 * Used by GitHub Actions to verify successful deployment.
 */
import http from "http";

let applyCount  = 0;
let failCount   = 0;
let lastApplyAt = "";

export function recordApply()   { applyCount++;  lastApplyAt = new Date().toISOString(); }
export function recordFailure() { failCount++; }

export function startHealthServer(port = 3001): void {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status:      "ok",
        pid:         process.pid,
        uptime:      Math.round(process.uptime()),
        memory:      Math.round(process.memoryUsage().rss / 1024 / 1024),  // MB
        applyCount,
        failCount,
        lastApplyAt: lastApplyAt || null,
        ts:          new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[health] Listening on port ${port} — GET /health`);
  });

  server.on("error", (err) => {
    console.error("[health] Server error:", err.message);
  });
}
