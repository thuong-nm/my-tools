import { domainError, type DomainError, type ValidationError } from "@/lib/domain/errors/domain-error";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { asUserId } from "@/lib/domain/shared/identifier";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { shareCode } from "@/lib/domain/value-objects/share-code";
import { shareTitle } from "@/lib/domain/value-objects/share-title";

export type RenameTextShareInput = {
  readonly code: string;
  readonly ownerId: string;
  /** Blank clears the title rather than failing — one call site for set and unset. */
  readonly title: string;
};

export type RenameTextShareDeps = {
  readonly shares: TextShareRepository;
};

export type RenameTextShareError =
  | ValidationError
  | RepositoryError
  | DomainError<"TEXT_SHARE_NOT_FOUND">;

/**
 * A share that exists but belongs to someone else answers NOT_FOUND, not FORBIDDEN: telling a
 * caller that a code is real but not theirs turns this into a probe for which codes exist.
 */
export async function renameTextShare(
  input: RenameTextShareInput,
  deps: RenameTextShareDeps,
): Promise<Result<string | undefined, RenameTextShareError>> {
  const code = shareCode(input.code);
  if (isErr(code)) return code;

  const title = shareTitle(input.title);
  if (isErr(title)) return title;

  const renamed = await deps.shares.renameByOwner(code.value, asUserId(input.ownerId), title.value);
  if (isErr(renamed)) return renamed;

  if (!renamed.value) {
    return err(domainError("TEXT_SHARE_NOT_FOUND", "That share link does not exist."));
  }

  return ok(title.value);
}
