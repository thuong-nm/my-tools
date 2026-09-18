import { randomUUID } from "node:crypto";

import { serverConfig } from "@/lib/config";
import type { TextShareRepository, UserRepository } from "@/lib/domain/ports/repositories";
import { hashPassword, verifyPassword } from "./auth/password-hasher";
import { alwaysHuman, recaptchaVerifier, type VerifyHuman } from "./bot-defense/recaptcha/verify-token";
import { createPrismaClient, type PrismaDatabase } from "./prisma/client";
import { textShareRepository, userRepository } from "./prisma/repositories";
import { generateShareCode } from "./share-code";

// The only module allowed to construct an adapter, which is what makes "swap the payment vendor"
// a change to this file plus one folder. Use cases receive what they need through `deps`
// (rule 3); rule 7 names the other two modules that may read lib/config.ts.
export type Container = {
  readonly db: PrismaDatabase;

  // Exposed as ports, so a route handler never imports lib/infrastructure/prisma — which its
  // ESLint fence blocks anyway.
  readonly repositories: {
    readonly textShares: TextShareRepository;
    readonly users: UserRepository;
  };

  // Injected, not called in the domain: non-determinism lives out here (rule 1).
  readonly now: () => Date;
  readonly generateId: () => string;
  readonly generateShareCode: () => string;

  // Injected functions, not ports: hashing will never have a second implementation worth
  // swapping, and rule 9 names it as the worked example of what does NOT earn an interface.
  readonly hashPassword: (password: string) => Promise<string>;
  readonly verifyPassword: (password: string, hash: string) => Promise<boolean>;

  // Also a function rather than a port: no use case takes it, because "is this caller a bot" is
  // an edge concern like CORS, not a business rule. Route handlers call it before the use case.
  readonly verifyHuman: VerifyHuman;
};

let container: Container | undefined;

// Built once per process: adapters hold a connection pool and cached auth tokens, so rebuilding
// per request would leak both.
export function getContainer(): Container {
  if (container) return container;

  const config = serverConfig();

  const db = createPrismaClient({
    databaseUrl: config.database.url,
    isProduction: config.isProduction,
  });

  container = {
    db,
    repositories: {
      textShares: textShareRepository(db),
      users: userRepository(db),
    },
    now: () => new Date(),
    generateId: () => randomUUID(),
    generateShareCode,
    hashPassword,
    verifyPassword,
    verifyHuman: config.recaptcha.enabled
      ? recaptchaVerifier({
          secretKey: config.recaptcha.secretKey,
          minScore: config.recaptcha.minScore,
        })
      : alwaysHuman,
  };

  return container;
}

/** Test-only: drop the memoised instance so a test can wire its own fakes. */
export function resetContainer(): void {
  container = undefined;
}
