import { describe, expect, it } from "vitest";

import { PasswordReset } from "@/lib/domain/entities/password-reset";
import { unwrap } from "@/lib/domain/shared/result";
import { fakePasswordResetRepository } from "@/lib/testing/fakes/password-reset-repository";
import { resetPassword } from "./reset-password";

const NOW = new Date("2026-09-19T10:00:00.000Z");
const USER_ID = "4e1ccd7e-7402-4aca-8fd3-c348b09a5b63";
const GOOD_PASSWORD = "a-long-enough-password";

const hashResetToken = (token: string) => `hashed:${token}`;

function pending(overrides: { readonly expiresAt?: Date; readonly usedAt?: Date } = {}) {
  return unwrap(
    PasswordReset.restore({
      tokenHash: hashResetToken("plain-token"),
      userId: USER_ID,
      expiresAt: overrides.expiresAt ?? new Date(NOW.getTime() + 60_000),
      ...(overrides.usedAt ? { usedAt: overrides.usedAt } : {}),
    }),
  );
}

function deps(seed: readonly PasswordReset[]) {
  const resets = fakePasswordResetRepository(seed);

  return {
    resets,
    now: () => NOW,
    hashPassword: async (password: string) => `scrypt$${password}`,
    hashResetToken,
  };
}

describe("resetPassword", () => {
  it("sets the new hash and burns the token in one call", async () => {
    const d = deps([pending()]);

    const result = await resetPassword({ token: "plain-token", password: GOOD_PASSWORD }, d);

    expect(result.ok).toBe(true);
    expect(d.resets.consumed).toEqual([
      {
        tokenHash: hashResetToken("plain-token"),
        usedAt: NOW,
        newPasswordHash: `scrypt$${GOOD_PASSWORD}`,
      },
    ]);
  });

  it("never stores the plaintext token, only its hash", async () => {
    const d = deps([pending()]);

    await resetPassword({ token: "plain-token", password: GOOD_PASSWORD }, d);

    expect(d.resets.consumed[0]?.tokenHash).not.toBe("plain-token");
  });

  it("rejects an unknown token", async () => {
    const d = deps([]);

    const result = await resetPassword({ token: "nope", password: GOOD_PASSWORD }, d);

    expect(!result.ok && result.error.code).toBe("RESET_TOKEN_NOT_FOUND");
  });

  it("rejects an expired token, and at exactly the expiry instant", async () => {
    for (const expiresAt of [new Date(NOW.getTime() - 1), NOW]) {
      const d = deps([pending({ expiresAt })]);

      const result = await resetPassword({ token: "plain-token", password: GOOD_PASSWORD }, d);

      expect(!result.ok && result.error.code).toBe("RESET_TOKEN_EXPIRED");
    }
  });

  it("rejects a token that was already used", async () => {
    const d = deps([pending({ usedAt: new Date(NOW.getTime() - 1000) })]);

    const result = await resetPassword({ token: "plain-token", password: GOOD_PASSWORD }, d);

    expect(!result.ok && result.error.code).toBe("RESET_TOKEN_ALREADY_USED");
  });

  it("checks the password before the token, so a weak one does not burn a usable link", async () => {
    const d = deps([pending()]);

    const result = await resetPassword({ token: "plain-token", password: "short" }, d);

    expect(!result.ok && result.error.code).toBe("VALIDATION_FAILED");
    expect(d.resets.consumed).toHaveLength(0);
    expect(d.resets.rows.size).toBe(1);
  });

  it("reports a repository failure instead of reporting success", async () => {
    const d = deps([pending()]);
    d.resets.failEveryCall({ code: "REPOSITORY_UNAVAILABLE", message: "down" });

    const result = await resetPassword({ token: "plain-token", password: GOOD_PASSWORD }, d);

    expect(result.ok).toBe(false);
  });
});
