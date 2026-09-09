import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the connection URL out of `schema.prisma` to here. Uses the same loader as
// Next.js so `prisma migrate` and `next dev` cannot point at different databases. CLI-only, so
// reading process.env here is not a rule 7 breach.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
