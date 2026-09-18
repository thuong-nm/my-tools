import type { ValidationError } from "../errors/domain-error";
import { asUserId, type UserId } from "../shared/identifier";
import { isErr, ok, type Result } from "../shared/result";
import { email, type Email } from "../value-objects/email";
import { passwordHash, type PasswordHash } from "../value-objects/password";

export type CreateUserProps = {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
};

export type RestoreUserProps = CreateUserProps;

// No `createdAt`: nothing here reads it, and rule 5 keeps auditing columns in the row rather
// than on the entity. No state machine either — an account has no states yet.
export class User {
  private constructor(
    readonly id: UserId,
    readonly email: Email,
    readonly passwordHash: PasswordHash,
  ) {}

  static create(props: CreateUserProps): Result<User, ValidationError> {
    return User.build(props);
  }

  // Same checks as `create` because there is no clock to skip, but kept as its own name so a
  // stored row and fresh input never silently share a call site.
  static restore(props: RestoreUserProps): Result<User, ValidationError> {
    return User.build(props);
  }

  private static build(props: CreateUserProps): Result<User, ValidationError> {
    const address = email(props.email);
    if (isErr(address)) return address;

    const hash = passwordHash(props.passwordHash);
    if (isErr(hash)) return hash;

    return ok(new User(asUserId(props.id), address.value, hash.value));
  }
}
