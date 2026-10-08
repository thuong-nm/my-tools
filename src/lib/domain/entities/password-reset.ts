import { domainError, validationError, type DomainError, type ValidationError } from "../errors/domain-error";
import { InvalidStateTransitionError } from "../errors/domain-rule-error";
import { asUserId, type UserId } from "../shared/identifier";
import { err, ok, type Result } from "../shared/result";

export type PasswordResetProps = {
  /** Already hashed. The plaintext exists only in the email, never in our storage. */
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
};

export type RestorePasswordResetProps = PasswordResetProps & {
  readonly usedAt?: Date;
};

export type PasswordResetStatus = "PENDING" | "USED";

// Two states and exactly one transition, so the table rule collapses to a single guarded method.
// `usedAt` is the state: a row either has it or does not.
export class PasswordReset {
  private constructor(
    readonly tokenHash: string,
    readonly userId: UserId,
    readonly expiresAt: Date,
    private _usedAt: Date | undefined,
  ) {}

  get status(): PasswordResetStatus {
    return this._usedAt === undefined ? "PENDING" : "USED";
  }

  get usedAt(): Date | undefined {
    return this._usedAt;
  }

  static create(props: PasswordResetProps): Result<PasswordReset, ValidationError> {
    return PasswordReset.build(props);
  }

  /** Skips nothing: a stored row is already at its state, carried in `usedAt`. */
  static restore(props: RestorePasswordResetProps): Result<PasswordReset, ValidationError> {
    return PasswordReset.build(props, props.usedAt);
  }

  private static build(
    props: PasswordResetProps,
    usedAt?: Date,
  ): Result<PasswordReset, ValidationError> {
    if (props.tokenHash.trim().length === 0) {
      return err(validationError("A reset token hash is required.", {
        tokenHash: ["Must not be empty."],
      }));
    }

    if (Number.isNaN(props.expiresAt.getTime())) {
      return err(validationError("A reset token needs a valid expiry.", {
        expiresAt: ["Must be a real date."],
      }));
    }

    return ok(new PasswordReset(props.tokenHash, asUserId(props.userId), props.expiresAt, usedAt));
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /**
   * Throws rather than returning a Result: reaching a second `markUsed` means the caller did not
   * check `status`, which is our bug, not the visitor's input (rule 3's two error channels).
   */
  markUsed(now: Date): void {
    if (this._usedAt !== undefined) {
      throw new InvalidStateTransitionError("PasswordReset", "USED", "USED", []);
    }

    this._usedAt = now;
  }
}

export type PasswordResetUnusableCode = "RESET_TOKEN_EXPIRED" | "RESET_TOKEN_ALREADY_USED";

/** The two ways a token that exists is still not usable, kept beside the entity that decides. */
export function checkUsable(
  reset: PasswordReset,
  now: Date,
): Result<void, DomainError<PasswordResetUnusableCode>> {
  if (reset.status === "USED") {
    return err(domainError("RESET_TOKEN_ALREADY_USED", "That reset link has already been used."));
  }

  if (reset.isExpired(now)) {
    return err(domainError("RESET_TOKEN_EXPIRED", "That reset link has expired."));
  }

  return ok(undefined);
}
