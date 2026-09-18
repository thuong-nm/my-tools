import { describe, expect, it } from "vitest";

import { unwrap } from "../shared/result";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordHash,
  rawPassword,
} from "./password";

describe("rawPassword", () => {
  it("accepts a password at the minimum length", () => {
    const value = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(unwrap(rawPassword(value))).toBe(value);
  });

  // Trimming here would lock the owner out of the account they just created.
  it("keeps leading and trailing spaces", () => {
    expect(unwrap(rawPassword("  spaced  "))).toBe("  spaced  ");
  });

  it("rejects a password below the minimum length", () => {
    const result = rawPassword("a".repeat(MIN_PASSWORD_LENGTH - 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.details?.fieldErrors).toHaveProperty("password");
  });

  it("rejects a password long enough to make hashing expensive", () => {
    expect(rawPassword("a".repeat(MAX_PASSWORD_LENGTH + 1)).ok).toBe(false);
  });
});

describe("passwordHash", () => {
  it("accepts an opaque hash string", () => {
    expect(unwrap(passwordHash("scrypt$1$abc$def"))).toBe("scrypt$1$abc$def");
  });

  it.each([["empty", ""], ["blank", "   "]])("rejects a %s hash", (_label, value) => {
    expect(passwordHash(value).ok).toBe(false);
  });
});
