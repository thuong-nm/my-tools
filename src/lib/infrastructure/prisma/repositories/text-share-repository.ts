import { domainError } from "@/lib/domain/errors/domain-error";
import type { TextShare } from "@/lib/domain/entities/text-share";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { UserId } from "@/lib/domain/shared/identifier";
import type { ShareCode } from "@/lib/domain/value-objects/share-code";
import type { PrismaDatabase } from "../client";
import { toDomain, toPersistence } from "../mappers/text-share-mapper";

const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

// The vendor message names tables and columns, so it goes to `details` for the log rather than
// into `message`, which a 4xx sends to the client.
function unavailable(operation: string, cause: unknown): RepositoryError {
  return domainError("REPOSITORY_UNAVAILABLE", `The database did not answer ${operation}.`, {
    cause: cause instanceof Error ? cause.message : String(cause),
  });
}

export function textShareRepository(db: PrismaDatabase): TextShareRepository {
  return {
    async create(share: TextShare): Promise<Result<void, RepositoryError>> {
      try {
        await db.textShare.create({ data: toPersistence(share) });
        return ok(undefined);
      } catch (cause) {
        if (isUniqueViolation(cause)) {
          return err(domainError("REPOSITORY_CONFLICT", "That share code is already taken."));
        }
        return err(unavailable("while saving a share", cause));
      }
    },

    async findByCode(code: ShareCode): Promise<Result<TextShare | undefined, RepositoryError>> {
      let row;
      try {
        row = await db.textShare.findUnique({ where: { code } });
      } catch (cause) {
        return err(unavailable("while reading a share", cause));
      }

      if (!row) return ok(undefined);

      const share = toDomain(row);

      // Re-labelled, not passed through: a stale row is our data problem, and VALIDATION_FAILED
      // would make the route answer 400 for it.
      if (!share.ok) {
        return err(
          domainError("REPOSITORY_CORRUPT_ROW", `Stored share ${row.id} is no longer valid.`, {
            cause: share.error.message,
          }),
        );
      }

      return ok(share.value);
    },

    async listByOwner(
      ownerId: UserId,
      limit: number,
    ): Promise<Result<readonly TextShare[], RepositoryError>> {
      let rows;
      try {
        rows = await db.textShare.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });
      } catch (cause) {
        return err(unavailable("while listing an account's shares", cause));
      }

      const shares: TextShare[] = [];

      for (const row of rows) {
        const share = toDomain(row);

        // One unreadable row fails the whole listing rather than silently shortening it: a
        // history that quietly drops entries looks exactly like data loss to its owner.
        if (!share.ok) {
          return err(
            domainError("REPOSITORY_CORRUPT_ROW", `Stored share ${row.id} is no longer valid.`, {
              cause: share.error.message,
            }),
          );
        }

        shares.push(share.value);
      }

      return ok(shares);
    },

    // One statement, so there is no read-then-write race and no transaction to poison: the
    // composite primary key rejects a repeat, and DO NOTHING turns that into zero rows affected
    // rather than an error that would abort the surrounding transaction.
    async recordUniqueView(code: ShareCode, viewerHash: string) {
      try {
        await db.$executeRaw`
          INSERT INTO "TextShareView" ("shareId", "viewerHash")
          SELECT "id", ${viewerHash} FROM "TextShare" WHERE "code" = ${code}
          ON CONFLICT DO NOTHING
        `;
        return ok(undefined);
      } catch (cause) {
        return err(unavailable("while recording a view", cause));
      }
    },

    async countUniqueViews(code: ShareCode) {
      try {
        return ok(await db.textShareView.count({ where: { share: { code } } }));
      } catch (cause) {
        return err(unavailable("while counting views", cause));
      }
    },

    // `updateMany` rather than `update`: ownership belongs in the WHERE clause, and the affected
    // count is what tells us whether it matched without a second read.
    async renameByOwner(code: ShareCode, ownerId: UserId, title: string | undefined) {
      try {
        const changed = await db.textShare.updateMany({
          where: { code, ownerId },
          data: { title: title ?? null },
        });

        return ok(changed.count > 0);
      } catch (cause) {
        return err(unavailable("while renaming a share", cause));
      }
    },
  };
}
