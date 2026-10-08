import { domainError, type DomainError } from "@/lib/domain/errors/domain-error";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { shareCode } from "@/lib/domain/value-objects/share-code";

export type UnlockTextShareInput = {
  readonly code: string;
  readonly password: string;
};

export type UnlockTextShareDeps = {
  readonly shares: TextShareRepository;
  readonly verifyPassword: (password: string, hash: string) => Promise<boolean>;
  readonly now: () => Date;
};

export type UnlockTextShareError = RepositoryError | DomainError<"INVALID_SHARE_PASSWORD">;

const WRONG = "That password does not open this link.";

/**
 * One error for every rejection — wrong password, malformed code, unknown code, expired share,
 * and a share that has no password at all. Any finer answer turns this into a way to discover
 * which codes exist and which are protected without ever guessing a password.
 */
export async function unlockTextShare(
  input: UnlockTextShareInput,
  deps: UnlockTextShareDeps,
): Promise<Result<void, UnlockTextShareError>> {
  const code = shareCode(input.code);
  if (isErr(code)) return err(domainError("INVALID_SHARE_PASSWORD", WRONG));

  const found = await deps.shares.findByCode(code.value);
  if (isErr(found)) return found;

  const share = found.value;
  if (!share || share.isExpired(deps.now()) || share.passwordHash === undefined) {
    return err(domainError("INVALID_SHARE_PASSWORD", WRONG));
  }

  const matches = await deps.verifyPassword(input.password, share.passwordHash);

  return matches ? ok(undefined) : err(domainError("INVALID_SHARE_PASSWORD", WRONG));
}
