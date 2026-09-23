import { checkUsable, type PasswordResetUnusableCode } from "@/lib/domain/entities/password-reset";
import { domainError, type DomainError, type ValidationError } from "@/lib/domain/errors/domain-error";
import type { PasswordResetRepository, RepositoryError } from "@/lib/domain/ports/repositories";
import { err, isErr, type Result } from "@/lib/domain/shared/result";
import { passwordHash, rawPassword } from "@/lib/domain/value-objects/password";

export type ResetPasswordInput = {
  readonly token: string;
  readonly password: string;
};

export type ResetPasswordDeps = {
  readonly resets: PasswordResetRepository;
  readonly now: () => Date;
  readonly hashPassword: (password: string) => Promise<string>;
  readonly hashResetToken: (token: string) => string;
};

export type ResetPasswordError =
  | RepositoryError
  | ValidationError
  | DomainError<"RESET_TOKEN_NOT_FOUND" | PasswordResetUnusableCode>;

export async function resetPassword(
  input: ResetPasswordInput,
  deps: ResetPasswordDeps,
): Promise<Result<void, ResetPasswordError>> {
  // Checked before the token so a weak password does not burn a usable link.
  const password = rawPassword(input.password);
  if (isErr(password)) return password;

  const tokenHash = deps.hashResetToken(input.token);

  const found = await deps.resets.findByTokenHash(tokenHash);
  if (isErr(found)) return found;

  const reset = found.value;
  if (!reset) {
    return err(domainError("RESET_TOKEN_NOT_FOUND", "That reset link is not valid."));
  }

  const now = deps.now();

  const usable = checkUsable(reset, now);
  if (isErr(usable)) return usable;

  const hashed = passwordHash(await deps.hashPassword(password.value));
  if (isErr(hashed)) return hashed;

  reset.markUsed(now);

  // One repository call, because burning the token and setting the password must not diverge:
  // storing the new password and leaving the link live would let it be replayed.
  return deps.resets.consume(tokenHash, now, hashed.value);
}
