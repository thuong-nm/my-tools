import { domainError } from "@/lib/domain/errors/domain-error";
import type { TextShare } from "@/lib/domain/entities/text-share";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import type { UserId } from "@/lib/domain/shared/identifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { ShareCode } from "@/lib/domain/value-objects/share-code";

export type FakeTextShareRepository = TextShareRepository & {
  readonly rows: ReadonlyMap<string, TextShare>;
  /** Makes the next `create` answer REPOSITORY_CONFLICT, to drive the code-retry loop. */
  failNextCreates(times: number): void;
  failEveryRead(error: RepositoryError): void;
};

export function fakeTextShareRepository(): FakeTextShareRepository {
  const rows = new Map<string, TextShare>();
  let forcedConflicts = 0;
  let readError: RepositoryError | undefined;

  return {
    rows,

    failNextCreates(times: number) {
      forcedConflicts = times;
    },

    failEveryRead(error: RepositoryError) {
      readError = error;
    },

    async create(share: TextShare): Promise<Result<void, RepositoryError>> {
      if (forcedConflicts > 0) {
        forcedConflicts -= 1;
        return err(domainError("REPOSITORY_CONFLICT", "That share code is already taken."));
      }

      if (rows.has(share.code)) {
        return err(domainError("REPOSITORY_CONFLICT", "That share code is already taken."));
      }

      rows.set(share.code, share);
      return ok(undefined);
    },

    async findByCode(code: ShareCode): Promise<Result<TextShare | undefined, RepositoryError>> {
      if (readError) return err(readError);
      return ok(rows.get(code));
    },

    async listByOwner(
      ownerId: UserId,
      limit: number,
    ): Promise<Result<readonly TextShare[], RepositoryError>> {
      if (readError) return err(readError);

      const owned = [...rows.values()]
        .filter((share) => share.ownerId === ownerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      return ok(owned);
    },
  };
}
