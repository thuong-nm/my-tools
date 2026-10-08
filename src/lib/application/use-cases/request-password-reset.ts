import { PasswordReset } from "@/lib/domain/entities/password-reset";
import type { Notifier, NotifierError } from "@/lib/domain/ports/notifier";
import type { PasswordResetRepository, RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import { isErr, ok, type Result } from "@/lib/domain/shared/result";
import { email } from "@/lib/domain/value-objects/email";

export type RequestPasswordResetInput = {
  readonly email: string;
};

export type RequestPasswordResetDeps = {
  readonly users: UserRepository;
  readonly resets: PasswordResetRepository;
  readonly notifier: Notifier;
  readonly now: () => Date;
  /** Returns the plaintext token and the hash to store — the plaintext never comes back here. */
  readonly generateResetToken: () => { readonly token: string; readonly tokenHash: string };
  /** Turns a token into the absolute link for the email; the edge owns APP_URL (rule 7). */
  readonly resetUrl: (token: string) => string;
  readonly ttlMs: number;
};

export type RequestPasswordResetError = RepositoryError | NotifierError;

/**
 * Answers the same whether the address exists or not: a different response for an unknown
 * address would tell an attacker which addresses have accounts, which is the exact oracle
 * `loginUser` already refuses to be.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  deps: RequestPasswordResetDeps,
): Promise<Result<void, RequestPasswordResetError>> {
  const address = email(input.email);
  if (isErr(address)) return ok(undefined);

  const found = await deps.users.findByEmail(address.value);
  if (isErr(found)) return found;

  const user = found.value;
  if (!user) return ok(undefined);

  // Requesting a new link retires the old ones, so a forwarded earlier email stops working.
  const cleared = await deps.resets.deletePendingFor(user.id);
  if (isErr(cleared)) return cleared;

  const { token, tokenHash } = deps.generateResetToken();
  const expiresAt = new Date(deps.now().getTime() + deps.ttlMs);

  const reset = PasswordReset.create({ tokenHash, userId: user.id, expiresAt });
  if (isErr(reset)) {
    return {
      ok: false,
      error: { code: "REPOSITORY_CORRUPT_ROW", message: reset.error.message },
    };
  }

  const stored = await deps.resets.create(reset.value);
  if (isErr(stored)) return stored;

  const sent = await deps.notifier.sendPasswordReset({
    to: address.value,
    resetUrl: deps.resetUrl(token),
    expiresAt,
  });
  if (isErr(sent)) return sent;

  return ok(undefined);
}
