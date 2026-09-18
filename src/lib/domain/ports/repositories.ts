import type { DomainError } from "../errors/domain-error";
import type { TextShare } from "../entities/text-share";
import type { User } from "../entities/user";
import type { UserId } from "../shared/identifier";
import type { Email } from "../value-objects/email";
import type { ShareCode } from "../value-objects/share-code";
import type { Result } from "../shared/result";

// One boundary, not one interface per aggregate (rule 9): every repository below is the same
// capability — "this app's database" — and lives behind the one Prisma adapter.
export type RepositoryErrorCode =
  | "REPOSITORY_UNAVAILABLE"
  | "REPOSITORY_CONFLICT"
  /** A stored row no longer satisfies current invariants: our data problem, not the caller's. */
  | "REPOSITORY_CORRUPT_ROW";

export type RepositoryError = DomainError<RepositoryErrorCode>;

export type TextShareRepository = {
  /** Answers REPOSITORY_CONFLICT when the code is taken — the unique index IS the lock. */
  create(share: TextShare): Promise<Result<void, RepositoryError>>;

  findByCode(code: ShareCode): Promise<Result<TextShare | undefined, RepositoryError>>;

  /** Newest first, and expired shares are included: history shows them flagged, not hidden. */
  listByOwner(
    ownerId: UserId,
    limit: number,
  ): Promise<Result<readonly TextShare[], RepositoryError>>;
};

export type UserRepository = {
  /** Answers REPOSITORY_CONFLICT when the email is taken — the unique index IS the lock. */
  create(user: User): Promise<Result<void, RepositoryError>>;

  findByEmail(address: Email): Promise<Result<User | undefined, RepositoryError>>;

  findById(id: UserId): Promise<Result<User | undefined, RepositoryError>>;
};
