import { domainError, type DomainError } from "@/lib/domain/errors/domain-error";
import type { RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import { asUserId } from "@/lib/domain/shared/identifier";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { toUserDto, type UserDto } from "../dto/user";

export type GetCurrentUserInput = {
  /** Comes from a verified session signature, never from the request body. */
  readonly userId: string;
};

export type GetCurrentUserDeps = {
  readonly users: UserRepository;
};

export type GetCurrentUserError = RepositoryError | DomainError<"USER_NOT_FOUND">;

// A signature that still verifies says nothing about the account behind it, so an id whose row
// is gone is reported rather than treated as a valid session.
export async function getCurrentUser(
  input: GetCurrentUserInput,
  deps: GetCurrentUserDeps,
): Promise<Result<UserDto, GetCurrentUserError>> {
  const found = await deps.users.findById(asUserId(input.userId));
  if (isErr(found)) return found;

  return found.value
    ? ok(toUserDto(found.value))
    : err(domainError("USER_NOT_FOUND", "That account no longer exists."));
}
