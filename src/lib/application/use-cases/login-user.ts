import { domainError, type DomainError } from "@/lib/domain/errors/domain-error";
import type { RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { email } from "@/lib/domain/value-objects/email";
import { toUserDto, type UserDto } from "../dto/user";

export type LoginUserInput = {
  readonly email: string;
  readonly password: string;
};

export type LoginUserDeps = {
  readonly users: UserRepository;
  readonly verifyPassword: (password: string, hash: string) => Promise<boolean>;
};

export type LoginUserError = RepositoryError | DomainError<"INVALID_CREDENTIALS">;

const INVALID_CREDENTIALS = "That email address and password do not match.";

// Every rejection is the same error, including a malformed address: telling the caller which
// half was wrong turns the form into an account-enumeration oracle.
export async function loginUser(
  input: LoginUserInput,
  deps: LoginUserDeps,
): Promise<Result<UserDto, LoginUserError>> {
  const address = email(input.email);
  if (isErr(address)) {
    return err(domainError("INVALID_CREDENTIALS", INVALID_CREDENTIALS));
  }

  const found = await deps.users.findByEmail(address.value);
  if (isErr(found)) return found;

  const user = found.value;
  if (!user) {
    return err(domainError("INVALID_CREDENTIALS", INVALID_CREDENTIALS));
  }

  const matches = await deps.verifyPassword(input.password, user.passwordHash);
  if (!matches) {
    return err(domainError("INVALID_CREDENTIALS", INVALID_CREDENTIALS));
  }

  return ok(toUserDto(user));
}
