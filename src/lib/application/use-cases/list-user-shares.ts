import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { asUserId } from "@/lib/domain/shared/identifier";
import { isErr, ok, type Result } from "@/lib/domain/shared/result";
import { toTextShareSummaryDto, type TextShareSummaryDto } from "../dto/text-share";

export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 200;

export type ListUserSharesInput = {
  /** Comes from a verified session, never from the request body. */
  readonly ownerId: string;
  readonly limit?: number;
};

export type ListUserSharesDeps = {
  readonly shares: TextShareRepository;
  readonly now: () => Date;
};

// Expired shares are listed, flagged rather than hidden: the owner saved them, so their absence
// would read as data loss instead of an expiry they chose.
export async function listUserShares(
  input: ListUserSharesInput,
  deps: ListUserSharesDeps,
): Promise<Result<readonly TextShareSummaryDto[], RepositoryError>> {
  const limit = clamp(input.limit ?? DEFAULT_HISTORY_LIMIT);

  const found = await deps.shares.listByOwner(asUserId(input.ownerId), limit);
  if (isErr(found)) return found;

  const now = deps.now();

  return ok(found.value.map((share) => toTextShareSummaryDto(share, now)));
}

function clamp(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_HISTORY_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_HISTORY_LIMIT);
}
