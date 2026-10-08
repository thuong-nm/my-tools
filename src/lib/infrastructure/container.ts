import { randomUUID } from "node:crypto";

import { serverConfig } from "@/lib/config";
import type { Notifier } from "@/lib/domain/ports/notifier";
import type {
  PasswordResetRepository,
  TextShareRepository,
  UserRepository,
} from "@/lib/domain/ports/repositories";
import { isProbablyBot, viewerHasher, type ViewerIdentity } from "./analytics/viewer-hash";
import { hashPassword, verifyPassword } from "./auth/password-hasher";
import { generateResetToken, hashResetToken } from "./auth/reset-token";
import { alwaysHuman, recaptchaVerifier, type VerifyHuman } from "./bot-defense/recaptcha/verify-token";
import { createPrismaClient, type PrismaDatabase } from "./prisma/client";
import { smtpNotifier, unconfiguredNotifier } from "./notification/smtp/smtp-notifier";
import {
  passwordResetRepository,
  textShareRepository,
  userRepository,
} from "./prisma/repositories";
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
    readonly passwordResets: PasswordResetRepository;
  };

  // A real port (rule 9's table names `notification` as a boundary), so the vendor stays in
  // infrastructure/notification and nothing above here knows SMTP exists.
  readonly notifier: Notifier;

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

  // Derived from the session secret rather than its own variable: one fewer thing to configure,
  // and the domain-separation string keeps the two uses from ever producing the same digest.
  readonly hashViewer: (code: string, identity: ViewerIdentity) => string;
  readonly isProbablyBot: (userAgent: string | undefined) => boolean;

  readonly generateResetToken: () => { readonly token: string; readonly tokenHash: string };
  readonly hashResetToken: (token: string) => string;
  readonly passwordResetTtlMs: number;
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
      passwordResets: passwordResetRepository(db),
    },
    notifier: config.smtp.enabled ? smtpNotifier(config.smtp) : unconfiguredNotifier,
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
    hashViewer: viewerHasher(config.session.secret),
    isProbablyBot,
    generateResetToken,
    hashResetToken,
    passwordResetTtlMs: config.passwordResetTtlMs,
  };

  return container;
}

/** Test-only: drop the memoised instance so a test can wire its own fakes. */
export function resetContainer(): void {
  container = undefined;
}
