import type { DomainError } from "../errors/domain-error";
import type { PasswordReset } from "../entities/password-reset";
import type { TextShare } from "../entities/text-share";
import type { User } from "../entities/user";
import type { UserId } from "../shared/identifier";
import type { Email } from "../value-objects/email";
import type { PasswordHash } from "../value-objects/password";
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

  /**
   * Remembers one distinct viewer. Idempotent by design: a second view from the same viewer
   * records nothing, so callers never have to check first.
   */
  recordUniqueView(code: ShareCode, viewerHash: string): Promise<Result<void, RepositoryError>>;

  countUniqueViews(code: ShareCode): Promise<Result<number, RepositoryError>>;
};

export type UserRepository = {
  /** Answers REPOSITORY_CONFLICT when the email is taken — the unique index IS the lock. */
  create(user: User): Promise<Result<void, RepositoryError>>;

  findByEmail(address: Email): Promise<Result<User | undefined, RepositoryError>>;

  findById(id: UserId): Promise<Result<User | undefined, RepositoryError>>;
};

export type PasswordResetRepository = {
  create(reset: PasswordReset): Promise<Result<void, RepositoryError>>;

  findByTokenHash(
    tokenHash: string,
  ): Promise<Result<PasswordReset | undefined, RepositoryError>>;

  /** Burns the token and sets the new hash together: two rows that must not diverge. */
  consume(
    tokenHash: string,
    usedAt: Date,
    newPasswordHash: PasswordHash,
  ): Promise<Result<void, RepositoryError>>;

  /** Every outstanding token for one account, so requesting a new link retires the old ones. */
  deletePendingFor(userId: UserId): Promise<Result<void, RepositoryError>>;
};
