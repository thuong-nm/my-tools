// cwd is derived from this file rather than hardcoded so the same config works from the main
// checkout and from a git worktree. DATABASE_URL overrides the docker-only host in .env:
// pm2 puts these in process.env, and Next's loader never overwrites what is already there.
const root = __dirname;

module.exports = {
  apps: [
    {
      name: "my-tool",
      cwd: root,
      script: `${root}/node_modules/.bin/next`,
      args: "start -p 3001",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
        APP_URL: "https://thuongnm.info.vn",
        DATABASE_URL: "postgresql://app:app@localhost:5432/app?schema=public",
      },
      max_memory_restart: "500M",
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: "10s",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: `${root}/logs/app-error.log`,
      out_file: `${root}/logs/app-out.log`,
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
