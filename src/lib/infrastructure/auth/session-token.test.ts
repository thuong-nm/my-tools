import { describe, expect, it } from "vitest";

import { signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "a-development-session-secret-at-least-32-chars";
const USER = "9c2f7a10-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-09T10:00:00.000Z");
const EXPIRES = new Date("2026-10-09T10:00:00.000Z");

const token = (overrides: { secret?: string; expiresAt?: Date } = {}) =>
  signSessionToken({
    userId: USER,
    expiresAt: overrides.expiresAt ?? EXPIRES,
    secret: overrides.secret ?? SECRET,
  });

describe("verifySessionToken", () => {
  it("returns the signed-in user for a token it issued", () => {
    expect(verifySessionToken({ token: token(), secret: SECRET, now: NOW })).toBe(USER);
  });

  it("rejects a token signed with a different secret", () => {
    const forged = token({ secret: "a-different-session-secret-32-characters" });
    expect(verifySessionToken({ token: forged, secret: SECRET, now: NOW })).toBeUndefined();
  });

  // The payload is readable, so the signature is the only thing standing between a visitor and
  // any account they care to name.
  it("rejects a token whose claims were edited", () => {
    const [, signature] = token().split(".");
    const tampered = `${Buffer.from(
      JSON.stringify({ sub: "somebody-else", exp: Math.floor(EXPIRES.getTime() / 1000) }),
    ).toString("base64url")}.${signature}`;

    expect(verifySessionToken({ token: tampered, secret: SECRET, now: NOW })).toBeUndefined();
  });

  it("rejects a token that has expired", () => {
    const after = new Date(EXPIRES.getTime() + 1000);
    expect(verifySessionToken({ token: token(), secret: SECRET, now: after })).toBeUndefined();
  });

  it("rejects a token at exactly its expiry", () => {
    expect(verifySessionToken({ token: token(), secret: SECRET, now: EXPIRES })).toBeUndefined();
  });

  it.each([
    ["empty", ""],
    ["no signature", "eyJzdWIiOiJhIn0"],
    ["too many segments", "a.b.c"],
    ["undecodable payload", "!!!!.c2ln"],
  ])("returns undefined for a %s token", (_label, malformed) => {
    expect(verifySessionToken({ token: malformed, secret: SECRET, now: NOW })).toBeUndefined();
  });

  it("rejects a correctly signed payload that carries no subject", () => {
    const empty = signSessionToken({ userId: "", expiresAt: EXPIRES, secret: SECRET });
    expect(verifySessionToken({ token: empty, secret: SECRET, now: NOW })).toBeUndefined();
  });
});
