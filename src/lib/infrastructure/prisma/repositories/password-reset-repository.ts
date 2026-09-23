import type { PasswordReset } from "@/lib/domain/entities/password-reset";
import { domainError } from "@/lib/domain/errors/domain-error";
import type { PasswordResetRepository, RepositoryError } from "@/lib/domain/ports/repositories";
import type { UserId } from "@/lib/domain/shared/identifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { PasswordHash } from "@/lib/domain/value-objects/password";
import type { PrismaDatabase } from "../client";
import { toDomain, toPersistence } from "../mappers/password-reset-mapper";

function unavailable(operation: string, cause: unknown): RepositoryError {
  return domainError("REPOSITORY_UNAVAILABLE", `The database did not answer ${operation}.`, {
    cause: cause instanceof Error ? cause.message : String(cause),
  });
}

export function passwordResetRepository(db: PrismaDatabase): PasswordResetRepository {
  return {
    async create(reset: PasswordReset): Promise<Result<void, RepositoryError>> {
      try {
        await db.passwordReset.create({ data: toPersistence(reset) });
        return ok(undefined);
      } catch (cause) {
        return err(unavailable("while storing a reset token", cause));
      }
    },

    async findByTokenHash(tokenHash: string) {
      let row;
      try {
        row = await db.passwordReset.findUnique({ where: { tokenHash } });
      } catch (cause) {
        return err(unavailable("while reading a reset token", cause));
      }

      if (!row) return ok(undefined);

      const reset = toDomain(row);
      if (!reset.ok) {
        return err(
          domainError("REPOSITORY_CORRUPT_ROW", "A stored reset token is no longer valid.", {
            cause: reset.error.message,
          }),
        );
      }

      return ok(reset.value);
    },

    // One transaction, and the UPDATE is guarded by `usedAt: null`: two requests racing the same
    // link both read it as pending, so the guard — not the read — is what makes it single-use.
    async consume(tokenHash: string, usedAt: Date, newPasswordHash: PasswordHash) {
      try {
        return await db.$transaction(async (tx) => {
          const claimed = await tx.passwordReset.updateMany({
            where: { tokenHash, usedAt: null },
            data: { usedAt },
          });

          if (claimed.count === 0) {
            return err(
              domainError("REPOSITORY_CONFLICT", "That reset link has already been used."),
            );
          }

          const row = await tx.passwordReset.findUniqueOrThrow({ where: { tokenHash } });
          await tx.user.update({
            where: { id: row.userId },
            data: { passwordHash: newPasswordHash },
          });

          return ok(undefined);
        });
      } catch (cause) {
        return err(unavailable("while consuming a reset token", cause));
      }
    },

    async deletePendingFor(userId: UserId) {
      try {
        await db.passwordReset.deleteMany({ where: { userId, usedAt: null } });
        return ok(undefined);
      } catch (cause) {
        return err(unavailable("while retiring reset tokens", cause));
      }
    },
  };
}
