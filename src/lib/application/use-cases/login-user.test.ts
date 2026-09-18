import { describe, expect, it, vi } from "vitest";

import { User } from "@/lib/domain/entities/user";
import { domainError } from "@/lib/domain/errors/domain-error";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeUserRepository } from "@/lib/testing/fakes/user-repository";
import { loginUser } from "./login-user";

const EXISTING = unwrap(
  User.create({
    id: "9c2f7a10-0000-4000-8000-000000000001",
    email: "thuong@example.com",
    passwordHash: "scrypt$correct horse battery",
  }),
);

const INPUT = { email: "Thuong@Example.com", password: "correct horse battery" };

function deps(users = fakeUserRepository([EXISTING])) {
  return {
    users,
    verifyPassword: async (password: string, hash: string) => hash === `scrypt$${password}`,
  };
}

describe("loginUser", () => {
  it("matches a stored account regardless of how the address was typed", async () => {
    const result = await loginUser(INPUT, deps());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ id: EXISTING.id, email: "thuong@example.com" });
  });

  // Distinguishing the two would turn the sign-in form into an account-enumeration oracle.
  it.each([
    ["an unknown address", { email: "nobody@example.com" }],
    ["a wrong password", { password: "wrong password here" }],
    ["a malformed address", { email: "not-an-email" }],
  ])("answers the same error for %s", async (_label, override) => {
    const result = await loginUser({ ...INPUT, ...override }, deps());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("never reaches the repository for a malformed address", async () => {
    const users = fakeUserRepository([EXISTING]);
    const findByEmail = vi.fn(users.findByEmail);

    await loginUser({ ...INPUT, email: "nope" }, { ...deps(users), users: { ...users, findByEmail } });

    expect(findByEmail).not.toHaveBeenCalled();
  });

  // A database outage is our failure, and answering INVALID_CREDENTIALS would tell the caller
  // their password is wrong when we simply could not look.
  it("passes a repository failure through rather than reporting bad credentials", async () => {
    const users = fakeUserRepository([EXISTING]);
    users.failEveryRead(domainError("REPOSITORY_UNAVAILABLE", "down"));

    const result = await loginUser(INPUT, deps(users));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPOSITORY_UNAVAILABLE");
  });
});
