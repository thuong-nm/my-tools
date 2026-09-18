import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";
import type { Branded } from "../shared/branded";

/** Always normalised — lowercase and trimmed — so it is safe to use as the unique key. */
export type Email = Branded<string, "Email">;

/** RFC 5321's limit on a forward path. */
export const MAX_EMAIL_LENGTH = 254;

// Deliberately permissive: the only authority on whether an address exists is delivery to it,
// and a stricter pattern rejects valid addresses (plus-tags, new TLDs) for nothing.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function email(value: string): Result<Email, ValidationError> {
  const normalised = value.trim().toLowerCase();

  if (normalised.length === 0) {
    return err(
      validationError("An email address is required.", { email: ["Must not be empty."] }),
    );
  }

  if (normalised.length > MAX_EMAIL_LENGTH) {
    return err(
      validationError("That email address is too long.", {
        email: [`Must be at most ${MAX_EMAIL_LENGTH} characters.`],
      }),
    );
  }

  if (!EMAIL_PATTERN.test(normalised)) {
    return err(
      validationError("That is not a valid email address.", {
        email: ["Must look like name@example.com."],
      }),
    );
  }

  return ok(normalised as Email);
}
