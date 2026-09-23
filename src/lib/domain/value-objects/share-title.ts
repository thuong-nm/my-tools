import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";
import type { Branded } from "../shared/branded";

/** The owner's label for a share. Public: everyone who opens the link sees it. */
export type ShareTitle = Branded<string, "ShareTitle">;

// Short enough to sit in a browser tab and a link preview, which is the whole point of it.
export const MAX_SHARE_TITLE_LENGTH = 120;

// Control characters are stripped rather than rejected: a title is usually pasted, and a stray
// newline from a copied heading should not be an error the person has to understand.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/**
 * Blank means "no title" rather than a failure, so clearing one goes through the same call as
 * setting one and the caller never needs a second code path.
 */
export function shareTitle(value: string): Result<ShareTitle | undefined, ValidationError> {
  const cleaned = value.replace(CONTROL_CHARACTERS, " ").trim().replace(/\s+/g, " ");

  if (cleaned.length === 0) return ok(undefined);

  if (cleaned.length > MAX_SHARE_TITLE_LENGTH) {
    return err(
      validationError("That title is too long.", {
        title: [`Must be at most ${MAX_SHARE_TITLE_LENGTH} characters.`],
      }),
    );
  }

  return ok(cleaned as ShareTitle);
}
