import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Default import, not `import { loadEnvConfig }`: `@next/env` is CommonJS, and Vite bundles this
// config as ESM, where the named export does not exist.
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // `node`, not jsdom, so an accidental `window` reference fails instead of passing. A component
    // test opts in per file with `// @vitest-environment jsdom`.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "prisma/generated/**",
      // These need a live Postgres; `npm test` must stay runnable with nothing started.
      "**/*.integration.test.{ts,tsx}",
    ],
  },
});
