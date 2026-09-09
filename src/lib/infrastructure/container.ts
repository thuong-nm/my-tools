import { randomUUID } from "node:crypto";

import { serverConfig } from "@/lib/config";
import { createPrismaClient, type PrismaDatabase } from "./prisma/client";

// The only module allowed to construct an adapter, which is what makes "swap the payment vendor"
// a change to this file plus one folder. Use cases receive what they need through `deps`
// (rule 3); rule 7 names the other two modules that may read lib/config.ts.
export type Container = {
  readonly db: PrismaDatabase;

  // Injected, not called in the domain: non-determinism lives out here (rule 1).
  readonly now: () => Date;
  readonly generateId: () => string;
};

let container: Container | undefined;

// Built once per process: adapters hold a connection pool and cached auth tokens, so rebuilding
// per request would leak both.
export function getContainer(): Container {
  if (container) return container;

  const config = serverConfig();

  container = {
    db: createPrismaClient({
      databaseUrl: config.database.url,
      isProduction: config.isProduction,
    }),
    now: () => new Date(),
    generateId: () => randomUUID(),
  };

  return container;
}

/** Test-only: drop the memoised instance so a test can wire its own fakes. */
export function resetContainer(): void {
  container = undefined;
}
