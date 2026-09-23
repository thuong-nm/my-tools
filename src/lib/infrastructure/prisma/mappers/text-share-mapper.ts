import { TextShare } from "@/lib/domain/entities/text-share";
import type { ValidationError } from "@/lib/domain/errors/domain-error";
import type { Result } from "@/lib/domain/shared/result";
import type { TextShare as TextShareRow } from "@/prisma/generated/client/client";

// A Prisma model is not a domain entity (rule 5): `updatedAt` exists for auditing and no rule
// reads it, so it stops here. `null` becomes `undefined` — Postgres has no `undefined`.
export function toDomain(row: TextShareRow): Result<TextShare, ValidationError> {
  return TextShare.restore({
    id: row.id,
    code: row.code,
    content: row.content,
    format: row.format,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    ...(row.ownerId === null ? {} : { ownerId: row.ownerId }),
    ...(row.title === null ? {} : { title: row.title }),
  });
}

export function toPersistence(share: TextShare) {
  return {
    id: share.id,
    code: share.code,
    content: share.content,
    format: share.format,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    ownerId: share.ownerId ?? null,
    title: share.title ?? null,
  };
}
