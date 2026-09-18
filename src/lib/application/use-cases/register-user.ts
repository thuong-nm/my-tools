import { domainError, type DomainError, type ValidationError } from "@/lib/domain/errors/domain-error";
import { User } from "@/lib/domain/entities/user";
import type { RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import { err, isErr, ok, type Result } from "@/lib/domain/shared/result";
import { email } from "@/lib/domain/value-objects/email";
import { rawPassword } from "@/lib/domain/value-objects/password";
import { toUserDto, type UserDto } from "../dto/user";

export type RegisterUserInput = {
  readonly email: string;
  readonly password: string;
};

// `hashPassword` is an injected function, not a port: it will never have a second
// implementation worth swapping, and rule 9 names it as the worked example of that.
export type RegisterUserDeps = {
  readonly users: UserRepository;
  readonly generateId: () => string;
  readonly hashPassword: (password: string) => Promise<string>;
};

export type RegisterUserError =
  | ValidationError
  | RepositoryError
  | DomainError<"EMAIL_ALREADY_REGISTERED">;

// INSERTs and lets the unique index reject a duplicate, rather than asking whether the address
// is free first: at READ COMMITTED two sign-ups race and both read "free".
export async function registerUser(
  input: RegisterUserInput,
  deps: RegisterUserDeps,
): Promise<Result<UserDto, RegisterUserError>> {
  const address = email(input.email);
  if (isErr(address)) return address;

  // Checked before hashing: a KDF is deliberately slow, so a rejected password must not pay it.
  const password = rawPassword(input.password);
  if (isErr(password)) return password;

  const user = User.create({
    id: deps.generateId(),
    email: address.value,
    passwordHash: await deps.hashPassword(password.value),
  });

  if (isErr(user)) return user;

  const saved = await deps.users.create(user.value);

  if (isErr(saved)) {
    if (saved.error.code === "REPOSITORY_CONFLICT") {
      return err(
        domainError("EMAIL_ALREADY_REGISTERED", "That email address is already registered."),
      );
    }
    return saved;
  }

  return ok(toUserDto(user.value));
}
