import { domainError, type DomainError, type ValidationError } from "@/lib/domain/errors/domain-error";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { shareCode } from "@/lib/domain/value-objects/share-code";
import { toTextShareDto, type TextShareDto } from "../dto/text-share";

export type GetTextShareInput = {
  readonly code: string;
  /** Absent for a signed-out reader. Only a match against `ownerId` unlocks the view count. */
  readonly viewerId?: string;
};

export type GetTextShareDeps = {
  readonly shares: TextShareRepository;
  readonly now: () => Date;
};

export type GetTextShareError =
  | ValidationError
  | RepositoryError
  | DomainError<"TEXT_SHARE_NOT_FOUND" | "TEXT_SHARE_EXPIRED">;

// An expired share is reported, not deleted: a read that writes turns every page view into a
// transaction, and reclaiming the row is a purge job's business.
export async function getTextShare(
  input: GetTextShareInput,
  deps: GetTextShareDeps,
): Promise<Result<TextShareDto, GetTextShareError>> {
  const code = shareCode(input.code);
  if (isErr(code)) return code;

  const found = await deps.shares.findByCode(code.value);
  if (isErr(found)) return found;

  const share = found.value;

  if (!share) {
    return err(domainError("TEXT_SHARE_NOT_FOUND", "That share link does not exist."));
  }

  if (share.isExpired(deps.now())) {
    return err(domainError("TEXT_SHARE_EXPIRED", "That share link has expired."));
  }

  // Counted only for the owner: nobody else may learn it, so nobody else pays for the query.
  if (input.viewerId === undefined || share.ownerId !== input.viewerId) {
    return ok(toTextShareDto(share));
  }

  const views = await deps.shares.countUniqueViews(code.value);
  if (isErr(views)) return views;

  return ok(toTextShareDto(share, views.value));
}
