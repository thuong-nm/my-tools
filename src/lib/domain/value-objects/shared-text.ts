import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";
import type { Branded } from "../shared/branded";

/** The stored payload: already compressed and URL-safe, so opaque to the server. */
export type SharedText = Branded<string, "SharedText">;

// Measured in characters rather than bytes: the payload is percent-encoded or base64url, so it
// is ASCII, and `.length` keeps this file free of `TextEncoder` (rule 1).
export const MAX_SHARED_TEXT_LENGTH = 512 * 1024;

export function sharedText(value: string): Result<SharedText, ValidationError> {
  if (value.trim().length === 0) {
    return err(validationError("There is nothing to share.", { content: ["Must not be empty."] }));
  }

  if (value.length > MAX_SHARED_TEXT_LENGTH) {
    return err(
      validationError("That text is too large to share.", {
        content: [`Must be at most ${MAX_SHARED_TEXT_LENGTH} characters once compressed.`],
      }),
    );
  }

  return ok(value as SharedText);
}
