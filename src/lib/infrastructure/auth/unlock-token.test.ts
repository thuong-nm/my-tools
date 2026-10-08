import { describe, expect, it } from "vitest";

import { signSessionToken } from "./session-token";
import { UNLOCK_LIFETIME_HOURS, signUnlockToken, verifyUnlockToken } from "./unlock-token";

const SECRET = "a-secret-long-enough-to-be-realistic";
const NOW = new Date("2026-09-30T10:00:00.000Z");
const IN_24H = new Date(NOW.getTime() + UNLOCK_LIFETIME_HOURS * 60 * 60 * 1000);

const tokenFor = (code: string, expiresAt = IN_24H) =>
  signUnlockToken({ code, expiresAt, secret: SECRET });

describe("verifyUnlockToken", () => {
  it("accepts a token it just signed for that code", () => {
    expect(
      verifyUnlockToken({ token: tokenFor("abcdef2345"), code: "abcdef2345", secret: SECRET, now: NOW }),
    ).toBe(true);
  });

  it("refuses a token issued for a different share", () => {
    expect(
      verifyUnlockToken({ token: tokenFor("abcdef2345"), code: "zzzzzz9999", secret: SECRET, now: NOW }),
    ).toBe(false);
  });

  it("refuses a token signed with another secret", () => {
    const foreign = signUnlockToken({ code: "abcdef2345", expiresAt: IN_24H, secret: "other" });

    expect(
      verifyUnlockToken({ token: foreign, code: "abcdef2345", secret: SECRET, now: NOW }),
    ).toBe(false);
  });

  it("expires exactly at the 24-hour mark, not a moment after", () => {
    const token = tokenFor("abcdef2345");

    expect(
      verifyUnlockToken({ token, code: "abcdef2345", secret: SECRET, now: new Date(IN_24H.getTime() - 1000) }),
    ).toBe(true);
    expect(
      verifyUnlockToken({ token, code: "abcdef2345", secret: SECRET, now: IN_24H }),
    ).toBe(false);
  });

  it("refuses a token whose expiry was edited to a later one", () => {
    const token = tokenFor("abcdef2345");
    const forged = `${Math.floor(IN_24H.getTime() / 1000) + 99999}.${token.split(".")[1]}`;

    expect(
      verifyUnlockToken({ token: forged, code: "abcdef2345", secret: SECRET, now: NOW }),
    ).toBe(false);
  });

  it("refuses rubbish instead of throwing on it", () => {
    for (const token of ["", ".", "abc", "notanumber.sig", ".onlysig"]) {
      expect(
        verifyUnlockToken({ token, code: "abcdef2345", secret: SECRET, now: NOW }),
        token,
      ).toBe(false);
    }
  });

  // The two tokens share a secret, so only the domain separator keeps one from being the other.
  it("refuses a session token for the same secret", () => {
    const session = signSessionToken({ userId: "abcdef2345", expiresAt: IN_24H, secret: SECRET });

    expect(
      verifyUnlockToken({ token: session, code: "abcdef2345", secret: SECRET, now: NOW }),
    ).toBe(false);
  });
});
