import { domainError, type DomainError, type ValidationError } from "@/lib/domain/errors/domain-error";
import { TextShare } from "@/lib/domain/entities/text-share";
import type { RepositoryError, TextShareRepository } from "@/lib/domain/ports/repositories";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { toTextShareDto, type TextShareDto } from "../dto/text-share";

export type CreateTextShareInput = {
  readonly content: string;
  readonly format: string;
  readonly retention: string;
  /** Comes from a verified session, never from the request body: it decides whose history
   *  the share lands in. Absent means an anonymous share. */
  readonly ownerId?: string;
};

export type CreateTextShareDeps = {
  readonly shares: TextShareRepository;
  readonly now: () => Date;
  readonly generateId: () => string;
  readonly generateShareCode: () => string;
};

export type CreateTextShareError =
  | ValidationError
  | RepositoryError
  | DomainError<"SHARE_CODE_EXHAUSTED">;

const MAX_CODE_ATTEMPTS = 5;

// Generates a code and INSERTs it, retrying on conflict, rather than checking whether a code is
// free first: at READ COMMITTED two callers both read "free" and both insert.
export async function createTextShare(
  input: CreateTextShareInput,
  deps: CreateTextShareDeps,
): Promise<Result<TextShareDto, CreateTextShareError>> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const share = TextShare.create({
      id: deps.generateId(),
      code: deps.generateShareCode(),
      content: input.content,
      format: input.format,
      retention: input.retention,
      now: deps.now(),
      ownerId: input.ownerId,
    });

    if (isErr(share)) return share;

    const saved = await deps.shares.create(share.value);

    if (saved.ok) return ok(toTextShareDto(share.value));
    if (saved.error.code !== "REPOSITORY_CONFLICT") return saved;
  }

  return err(
    domainError(
      "SHARE_CODE_EXHAUSTED",
      `Could not find a free share code in ${MAX_CODE_ATTEMPTS} attempts.`,
    ),
  );
}
