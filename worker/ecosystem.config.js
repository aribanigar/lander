module.exports = {
  apps: [
    {
      name:    "landed-worker",
      script:  "dist/index.js",
      cwd:     __dirname,

      // Single instance — browser sessions are managed internally with WORKER_CONCURRENCY
      instances:    1,
      exec_mode:    "fork",

      // Reliability
      autorestart:  true,
      watch:        false,
      max_restarts: 10,
      min_uptime:   "10s",                   // don't count restart if crashes within 10s
      exp_backoff_restart_delay: 100,        // exponential backoff on repeated crashes

      // Memory safety — restart if RAM usage spikes (browser leak protection)
      max_memory_restart: "1500M",

      // Logging
      out_file:        "/var/log/landed-worker/out.log",
      error_file:      "/var/log/landed-worker/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs:      true,

      // Environment
      env: {
        NODE_ENV:    "production",
        HEALTH_PORT: "3001",
      },
    },
  ],
};
