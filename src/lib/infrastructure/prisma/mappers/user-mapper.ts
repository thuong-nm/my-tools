import { User } from "@/lib/domain/entities/user";
import type { ValidationError } from "@/lib/domain/errors/domain-error";
import type { Result } from "@/lib/domain/shared/result";
import type { User as UserRow } from "@/prisma/generated/client/client";

// `createdAt`/`updatedAt` stop here: no business rule reads them, so they stay auditing columns
// rather than entity fields (rule 5).
export function toDomain(row: UserRow): Result<User, ValidationError> {
  return User.restore({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
  });
}

export function toPersistence(user: User) {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
  };
}
