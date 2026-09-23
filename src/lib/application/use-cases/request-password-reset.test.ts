import { describe, expect, it } from "vitest";

import { User } from "@/lib/domain/entities/user";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeNotifier } from "@/lib/testing/fakes/notifier";
import { fakePasswordResetRepository } from "@/lib/testing/fakes/password-reset-repository";
import { fakeUserRepository } from "@/lib/testing/fakes/user-repository";
import { requestPasswordReset } from "./request-password-reset";

const NOW = new Date("2026-09-19T10:00:00.000Z");
const TTL = 60 * 60 * 1000;

const USER = unwrap(
  User.create({
    id: "4e1ccd7e-7402-4aca-8fd3-c348b09a5b63",
    email: "owner@example.com",
    passwordHash: "scrypt$hash",
  }),
);

function deps(overrides: { readonly users?: ReturnType<typeof fakeUserRepository> } = {}) {
  const users = overrides.users ?? fakeUserRepository([USER]);
  const resets = fakePasswordResetRepository();
  const notifier = fakeNotifier();

  return {
    users,
    resets,
    notifier,
    now: () => NOW,
    generateResetToken: () => ({ token: "plain-token", tokenHash: "hashed-token" }),
    resetUrl: (token: string) => `https://example.test/reset-password?token=${token}`,
    ttlMs: TTL,
  };
}

describe("requestPasswordReset", () => {
  it("stores only the hash and emails only the plaintext", async () => {
    const d = deps();

    const result = await requestPasswordReset({ email: "owner@example.com" }, d);

    expect(result.ok).toBe(true);
    expect([...d.resets.rows.keys()]).toEqual(["hashed-token"]);
    expect(d.notifier.sent[0]?.resetUrl).toBe(
      "https://example.test/reset-password?token=plain-token",
    );
    // The plaintext must not be recoverable from what we kept.
    expect(JSON.stringify([...d.resets.rows.keys()])).not.toContain("plain-token");
  });

  it("expires the token ttlMs after now", async () => {
    const d = deps();

    await requestPasswordReset({ email: "owner@example.com" }, d);

    expect(d.notifier.sent[0]?.expiresAt).toEqual(new Date(NOW.getTime() + TTL));
  });

  it("retires outstanding tokens first, so an older emailed link stops working", async () => {
    const d = deps();

    await requestPasswordReset({ email: "owner@example.com" }, d);

    expect(d.resets.deletedFor).toEqual([USER.id]);
  });

  it("answers the same for an unknown address, and sends nothing", async () => {
    const d = deps();

    const result = await requestPasswordReset({ email: "nobody@example.com" }, d);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(d.notifier.sent).toHaveLength(0);
    expect(d.resets.rows.size).toBe(0);
  });

  it("answers the same for a malformed address — no oracle from a validation error", async () => {
    const d = deps();

    const result = await requestPasswordReset({ email: "not-an-email" }, d);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(d.notifier.sent).toHaveLength(0);
  });

  it("reports a repository failure rather than pretending the mail went out", async () => {
    const users = fakeUserRepository([USER]);
    users.failEveryRead({ code: "REPOSITORY_UNAVAILABLE", message: "down" });

    const result = await requestPasswordReset({ email: "owner@example.com" }, deps({ users }));

    expect(result.ok).toBe(false);
  });

  it("reports a notifier failure, so a silent send never looks like success", async () => {
    const d = deps();
    d.notifier.failEverySend({ code: "NOTIFIER_UNAVAILABLE", message: "smtp down" });

    const result = await requestPasswordReset({ email: "owner@example.com" }, d);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("NOTIFIER_UNAVAILABLE");
  });
});
