import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { isErr, ok, type Result } from "@/lib/domain/shared/result";
import { shareCode } from "@/lib/domain/value-objects/share-code";

export type RecordShareViewInput = {
  readonly code: string;
  /** Absent for a signed-out reader — they are always somebody else. */
  readonly viewerId?: string;
  readonly viewerHash: string;
};

export type RecordShareViewDeps = {
  readonly shares: TextShareRepository;
  readonly now: () => Date;
};

/**
 * Silent about everything the reader must not learn: a bad code, a missing share and an expired
 * one all return ok, because this runs beside a page render and its only job is to remember a
 * viewer — never to tell the caller whether the link exists.
 */
export async function recordShareView(
  input: RecordShareViewInput,
  deps: RecordShareViewDeps,
): Promise<Result<void, RepositoryError>> {
  const code = shareCode(input.code);
  if (isErr(code)) return ok(undefined);

  const found = await deps.shares.findByCode(code.value);
  if (isErr(found)) return found;

  const share = found.value;
  if (!share || share.isExpired(deps.now())) return ok(undefined);

  // The owner reading their own link is not an audience. Without this the number would mostly
  // count the one person who is allowed to see it.
  if (input.viewerId !== undefined && share.ownerId === input.viewerId) return ok(undefined);

  return deps.shares.recordUniqueView(code.value, input.viewerHash);
}
