import { connection } from "next/server";

import { ok } from "@/app/api/_lib/responses";

// Deliberately does NOT touch the database: a liveness probe that depends on Postgres reports
// "unhealthy" during a blip and gets the container restarted, which fixes nothing. Readiness
// against the DB belongs in a separate route.
export async function GET() {
  // Opts out of prerendering, so this reflects the running process, not build time.
  await connection();

  return ok({ status: "ok", timestampUtc: new Date().toISOString() });
}
