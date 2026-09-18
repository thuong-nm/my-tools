import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";
import type { Branded } from "../shared/branded";

/** The public half of a share link: `/s/<code>`. */
export type ShareCode = Branded<string, "ShareCode">;

export const SHARE_CODE_LENGTH = 10;

/** No `0/o`, `1/l/i` or `u/v` — a code gets read aloud and retyped from a screenshot. */
export const SHARE_CODE_ALPHABET = "23456789abcdefghjkmnpqrstwxyz";

// Accepts more than the generator produces, so codes minted by a future generator (a longer
// one, or a different alphabet) keep resolving instead of 400-ing at the edge.
const SHARE_CODE_PATTERN = /^[a-z0-9]{6,32}$/;

export function shareCode(value: string): Result<ShareCode, ValidationError> {
  if (!SHARE_CODE_PATTERN.test(value)) {
    return err(
      validationError("That is not a valid share code.", {
        code: ["Must be 6-32 lowercase letters or digits."],
      }),
    );
  }
  return ok(value as ShareCode);
}
