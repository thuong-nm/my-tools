import type { PasswordReset } from "@/lib/domain/entities/password-reset";
import type { PasswordResetRepository, RepositoryError } from "@/lib/domain/ports/repositories";
import type { UserId } from "@/lib/domain/shared/identifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { PasswordHash } from "@/lib/domain/value-objects/password";

export type ConsumedReset = {
  readonly tokenHash: string;
  readonly usedAt: Date;
  readonly newPasswordHash: PasswordHash;
};

export type FakePasswordResetRepository = PasswordResetRepository & {
  readonly rows: ReadonlyMap<string, PasswordReset>;
  readonly consumed: readonly ConsumedReset[];
  readonly deletedFor: readonly UserId[];
  failEveryCall(error: RepositoryError): void;
};

export function fakePasswordResetRepository(
  seed: readonly PasswordReset[] = [],
): FakePasswordResetRepository {
  const rows = new Map<string, PasswordReset>(seed.map((row) => [row.tokenHash, row]));
  const consumed: ConsumedReset[] = [];
  const deletedFor: UserId[] = [];
  let failure: RepositoryError | undefined;

  return {
    rows,
    consumed,
    deletedFor,

    failEveryCall(error: RepositoryError) {
      failure = error;
    },

    async create(reset: PasswordReset): Promise<Result<void, RepositoryError>> {
      if (failure) return err(failure);
      rows.set(reset.tokenHash, reset);
      return ok(undefined);
    },

    async findByTokenHash(tokenHash: string) {
      if (failure) return err(failure);
      return ok(rows.get(tokenHash));
    },

    async consume(tokenHash: string, usedAt: Date, newPasswordHash: PasswordHash) {
      if (failure) return err(failure);
      consumed.push({ tokenHash, usedAt, newPasswordHash });
      rows.delete(tokenHash);
      return ok(undefined);
    },

    async deletePendingFor(userId: UserId) {
      if (failure) return err(failure);
      deletedFor.push(userId);
      for (const [hash, row] of rows) if (row.userId === userId) rows.delete(hash);
      return ok(undefined);
    },
  };
}
