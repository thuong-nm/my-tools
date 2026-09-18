import { describe, expect, it, vi } from "vitest";

import { domainError } from "@/lib/domain/errors/domain-error";
import { fakeUserRepository } from "@/lib/testing/fakes/user-repository";
import { registerUser } from "./register-user";

const INPUT = { email: "Thuong@Example.com", password: "correct horse battery" };

function deps(users = fakeUserRepository()) {
  return {
    users,
    generateId: () => "9c2f7a10-0000-4000-8000-000000000001",
    hashPassword: async (password: string) => `scrypt$${password}`,
  };
}

describe("registerUser", () => {
  it("returns a DTO that never carries the password hash", async () => {
    const result = await registerUser(INPUT, deps());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      id: "9c2f7a10-0000-4000-8000-000000000001",
      email: "thuong@example.com",
    });
  });

  it("stores the hash, never the password", async () => {
    const users = fakeUserRepository();
    await registerUser(INPUT, deps(users));

    const stored = users.rows.get("thuong@example.com");
    expect(stored?.passwordHash).toBe("scrypt$correct horse battery");
  });

  it.each([
    ["email", { email: "not-an-email" }],
    ["password", { password: "short" }],
  ])("rejects a bad %s before touching the repository", async (_field, override) => {
    const users = fakeUserRepository();
    const result = await registerUser({ ...INPUT, ...override }, deps(users));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
    expect(users.rows.size).toBe(0);
  });

  // A KDF is deliberately slow, so a password the domain already rejected must not pay for one.
  it("does not hash a password it is going to reject", async () => {
    const hashPassword = vi.fn(async (password: string) => `scrypt$${password}`);
    await registerUser({ ...INPUT, password: "short" }, { ...deps(), hashPassword });

    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("reports a taken address as a conflict, not a validation failure", async () => {
    const users = fakeUserRepository();
    await registerUser(INPUT, deps(users));

    const again = await registerUser({ ...INPUT, email: "THUONG@example.com" }, deps(users));

    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("passes a non-conflict repository failure through untouched", async () => {
    const users = fakeUserRepository();
    const unavailable = domainError("REPOSITORY_UNAVAILABLE", "down");
    const create = vi.fn(async () => ({ ok: false as const, error: unavailable }));

    const result = await registerUser(INPUT, { ...deps(users), users: { ...users, create } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPOSITORY_UNAVAILABLE");
  });
});
