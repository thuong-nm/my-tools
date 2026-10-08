import {
  domainError,
  validationError,
  type DomainError,
  type ValidationError,
} from "@/lib/domain/errors/domain-error";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { asUserId } from "@/lib/domain/shared/identifier";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { shareCode } from "@/lib/domain/value-objects/share-code";
import { shareTitle } from "@/lib/domain/value-objects/share-title";

export type UpdateTextShareInput = {
  readonly code: string;
  readonly ownerId: string;
  /** Absent leaves the title alone; blank clears it. */
  readonly title?: string;
  /**
   * Absent leaves the password alone — the dialog cannot show the current one, so an untouched
   * field must not silently unlock the link. `null` or blank removes it. Any non-blank value is
   * accepted: this guards a document someone chose to share, not an account.
   */
  readonly password?: string | null;
};

export type UpdateTextShareDeps = {
  readonly shares: TextShareRepository;
  readonly hashPassword: (password: string) => Promise<string>;
};

export type UpdateTextShareResult = {
  readonly title?: string;
  /** Present only when the password was touched — otherwise the caller already knows. */
  readonly hasPassword?: boolean;
};

export type UpdateTextShareError =
  | ValidationError
  | RepositoryError
  | DomainError<"TEXT_SHARE_NOT_FOUND">;

/**
 * A share that exists but belongs to someone else answers NOT_FOUND, not FORBIDDEN: telling a
 * caller that a code is real but not theirs turns this into a probe for which codes exist.
 */
export async function updateTextShare(
  input: UpdateTextShareInput,
  deps: UpdateTextShareDeps,
): Promise<Result<UpdateTextShareResult, UpdateTextShareError>> {
  const code = shareCode(input.code);
  if (isErr(code)) return code;

  const patch: { title?: string | undefined; passwordHash?: string | undefined } = {};
  let title: string | undefined;
  let hasPassword: boolean | undefined;

  if (input.title !== undefined) {
    const parsed = shareTitle(input.title);
    if (isErr(parsed)) return parsed;

    title = parsed.value;
    patch.title = parsed.value;
  }

  // `null`, blank and a real password are all "change it"; `undefined` never reaches here.
  if (input.password === null || input.password === "") {
    patch.passwordHash = undefined;
    hasPassword = false;
  } else if (input.password !== undefined) {
    // No minimum — any password the owner picks is allowed. The cap stays, because a KDF's cost
    // scales with input length and an unbounded one is a cheap way to burn server time.
    if (input.password.length > MAX_PASSWORD_LENGTH) {
      return err(
        validationError("That password is too long.", {
          password: [`Must be at most ${MAX_PASSWORD_LENGTH} characters.`],
        }),
      );
    }

    patch.passwordHash = await deps.hashPassword(input.password);
    hasPassword = true;
  }

  const updated = await deps.shares.updateByOwner(code.value, asUserId(input.ownerId), patch);
  if (isErr(updated)) return updated;

  if (!updated.value) {
    return err(domainError("TEXT_SHARE_NOT_FOUND", "That share link does not exist."));
  }

  return ok({
    ...(title === undefined ? {} : { title }),
    ...(hasPassword === undefined ? {} : { hasPassword }),
  });
}
