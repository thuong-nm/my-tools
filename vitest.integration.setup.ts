import nextEnv from "@next/env";

// Inside the WORKER, not the config: test files run in workers that do not inherit the main
// process's env, and that is where DATABASE_URL is read.
nextEnv.loadEnvConfig(process.cwd());
