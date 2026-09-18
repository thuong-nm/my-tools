import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password-hasher";

// `promisify` resolves to scrypt's 3-argument overload, which drops the cost options.
const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PASSWORD = "correct horse battery";

describe("hashPassword", () => {
  it("never stores the password itself", async () => {
    expect(await hashPassword(PASSWORD)).not.toContain(PASSWORD);
  });

  // A shared salt would let one rainbow table cover every account that picked the same password.
  it("produces a different hash each time for the same password", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });

  it("carries its own cost parameters so they can be raised later", async () => {
    expect(await hashPassword(PASSWORD)).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[\w+/=]+\$[\w+/=]+$/);
  });
});

describe("verifyPassword", () => {
  it("accepts the password it was made from", async () => {
    expect(await verifyPassword(PASSWORD, await hashPassword(PASSWORD))).toBe(true);
  });

  it.each([
    ["a wrong password", "wrong horse battery"],
    ["an empty password", ""],
    ["a one-character difference", "correct horse batteru"],
  ])("rejects %s", async (_label, candidate) => {
    expect(await verifyPassword(candidate, await hashPassword(PASSWORD))).toBe(false);
  });

  it("round-trips a password with leading and trailing spaces intact", async () => {
    const spaced = "  padded password  ";
    expect(await verifyPassword(spaced, await hashPassword(spaced))).toBe(true);
    expect(await verifyPassword(spaced.trim(), await hashPassword(spaced))).toBe(false);
  });

  // Raising the cost later must not lock out everyone who registered before it.
  it("verifies a hash stored at a lower cost than today's default", async () => {
    const salt = randomBytes(16);
    const cost = { N: 16_384, r: 8, p: 1 };
    const key = await derive(PASSWORD, salt, 64, {
      ...cost,
      maxmem: 128 * cost.N * cost.r * 2,
    });

    const legacy = [
      "scrypt",
      cost.N,
      cost.r,
      cost.p,
      salt.toString("base64"),
      key.toString("base64"),
    ].join("$");

    expect(await verifyPassword(PASSWORD, legacy)).toBe(true);
    expect(await verifyPassword("wrong horse battery", legacy)).toBe(false);
  });

  // An unreadable row is a failed sign-in, not a 500 telling the caller their account is broken.
  it.each([
    ["empty", ""],
    ["not our scheme", "bcrypt$2b$10$abcdef"],
    ["too few segments", "scrypt$32768$8$1$onlysalt"],
    ["non-numeric cost", "scrypt$xx$8$1$c2FsdHNhbHRzYWx0c2E=$aGFzaA=="],
    // An empty key decodes to a zero-length buffer, which would compare equal to a
    // zero-length candidate and accept every password.
    ["an empty key", "scrypt$32768$8$1$c2FsdHNhbHRzYWx0c2E=$"],
    ["a short key", "scrypt$32768$8$1$c2FsdHNhbHRzYWx0c2E=$aGFzaA=="],
    ["a short salt", `scrypt$32768$8$1$c2E=$${"a".repeat(88)}`],
  ])("answers false for a %s stored hash instead of throwing", async (_label, stored) => {
    await expect(verifyPassword(PASSWORD, stored)).resolves.toBe(false);
  });
});
