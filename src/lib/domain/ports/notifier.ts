import type { DomainError } from "../errors/domain-error";
import type { Email } from "../value-objects/email";
import type { Result } from "../shared/result";

// Named for the capability, never the vendor (rule 2): SMTP, SES or a queue all satisfy this.
export type NotifierError = DomainError<"NOTIFIER_UNAVAILABLE">;

export type PasswordResetMessage = {
  readonly to: Email;
  /** Already absolute. A use case may not read APP_URL (rule 7), so the edge builds it. */
  readonly resetUrl: string;
  readonly expiresAt: Date;
};

export type Notifier = {
  sendPasswordReset(message: PasswordResetMessage): Promise<Result<void, NotifierError>>;
};
