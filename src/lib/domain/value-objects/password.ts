import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";
import type { Branded } from "../shared/branded";

/** Plaintext, and only ever in flight: it is hashed before anything stores it. */
export type RawPassword = Branded<string, "RawPassword">;

/** Opaque here on purpose — the algorithm and its parameters belong to the hashing adapter. */
export type PasswordHash = Branded<string, "PasswordHash">;

export const MIN_PASSWORD_LENGTH = 8;

// Capped because a KDF's cost scales with input length: an unbounded password is a cheap way
// to make the server do expensive work.
export const MAX_PASSWORD_LENGTH = 200;

// Not trimmed, unlike an email: a leading or trailing space is a legitimate password character,
// and silently dropping one locks the owner out of the account they just made.
export function rawPassword(value: string): Result<RawPassword, ValidationError> {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return err(
      validationError("That password is too short.", {
        password: [`Must be at least ${MIN_PASSWORD_LENGTH} characters.`],
      }),
    );
  }

  if (value.length > MAX_PASSWORD_LENGTH) {
    return err(
      validationError("That password is too long.", {
        password: [`Must be at most ${MAX_PASSWORD_LENGTH} characters.`],
      }),
    );
  }

  return ok(value as RawPassword);
}

export function passwordHash(value: string): Result<PasswordHash, ValidationError> {
  if (value.trim().length === 0) {
    return err(
      validationError("A password hash is required.", {
        passwordHash: ["Must not be empty."],
      }),
    );
  }

  return ok(value as PasswordHash);
}
