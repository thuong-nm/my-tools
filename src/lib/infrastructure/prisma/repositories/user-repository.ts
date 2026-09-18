import { domainError } from "@/lib/domain/errors/domain-error";
import type { User } from "@/lib/domain/entities/user";
import type { RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import type { UserId } from "@/lib/domain/shared/identifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { Email } from "@/lib/domain/value-objects/email";
import type { User as UserRow } from "@/prisma/generated/client/client";
import type { PrismaDatabase } from "../client";
import { toDomain, toPersistence } from "../mappers/user-mapper";

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

function restored(row: UserRow): Result<User, RepositoryError> {
  const user = toDomain(row);

  // Re-labelled, not passed through: a stale row is our data problem, and VALIDATION_FAILED
  // would make the route answer 400 for it.
  if (!user.ok) {
    return err(
      domainError("REPOSITORY_CORRUPT_ROW", `Stored user ${row.id} is no longer valid.`, {
        cause: user.error.message,
      }),
    );
  }

  return ok(user.value);
}

export function userRepository(db: PrismaDatabase): UserRepository {
  return {
    async create(user: User): Promise<Result<void, RepositoryError>> {
      try {
        await db.user.create({ data: toPersistence(user) });
        return ok(undefined);
      } catch (cause) {
        if (isUniqueViolation(cause)) {
          return err(
            domainError("REPOSITORY_CONFLICT", "That email address is already registered."),
          );
        }
        return err(unavailable("while creating an account", cause));
      }
    },

    async findByEmail(address: Email): Promise<Result<User | undefined, RepositoryError>> {
      let row;
      try {
        row = await db.user.findUnique({ where: { email: address } });
      } catch (cause) {
        return err(unavailable("while reading an account", cause));
      }

      return row ? restored(row) : ok(undefined);
    },

    async findById(id: UserId): Promise<Result<User | undefined, RepositoryError>> {
      let row;
      try {
        row = await db.user.findUnique({ where: { id } });
      } catch (cause) {
        return err(unavailable("while reading an account", cause));
      }

      return row ? restored(row) : ok(undefined);
    },
  };
}
