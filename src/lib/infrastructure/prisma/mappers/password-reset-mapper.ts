import { PasswordReset } from "@/lib/domain/entities/password-reset";
import type { ValidationError } from "@/lib/domain/errors/domain-error";
import type { Result } from "@/lib/domain/shared/result";
import type { PasswordReset as PasswordResetRow } from "@/prisma/generated/client/client";

// `createdAt` stays in the row: nothing in the domain reads it, so rule 5 keeps it off the entity.
export function toDomain(row: PasswordResetRow): Result<PasswordReset, ValidationError> {
  return PasswordReset.restore({
    tokenHash: row.tokenHash,
    userId: row.userId,
    expiresAt: row.expiresAt,
    // Postgres has no `undefined`; the entity reads an absent `usedAt` as PENDING.
    ...(row.usedAt === null ? {} : { usedAt: row.usedAt }),
  });
}

export function toPersistence(reset: PasswordReset) {
  return {
    tokenHash: reset.tokenHash,
    userId: reset.userId,
    expiresAt: reset.expiresAt,
    usedAt: reset.usedAt ?? null,
  };
}
