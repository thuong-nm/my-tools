import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Separate from `npm test` so the unit suite stays verifiably DB-free. Needs `npm run db:up`.
// Default import: `@next/env` is CommonJS, and Vite bundles this config as ESM.
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "prisma/generated/**"],
    // Loads env in the worker, where DATABASE_URL is actually read; the call above only
    // affects Vitest's main process.
    setupFiles: ["./vitest.integration.setup.ts"],
    // Every file shares one database, so parallel files would interleave writes.
    fileParallelism: false,
    // A cold Postgres connection plus a first query is slower than a unit test.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
