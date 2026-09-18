import { describe, expect, it } from "vitest";

import { unwrap } from "../shared/result";
import { User } from "./user";

const VALID = {
  id: "9c2f7a10-0000-4000-8000-000000000001",
  email: "Thuong@Example.com",
  passwordHash: "scrypt$1$salt$hash",
};

describe("User.create", () => {
  it("stores the email normalised", () => {
    expect(unwrap(User.create(VALID)).email).toBe("thuong@example.com");
  });

  it.each([
    ["email", { email: "not-an-email" }],
    ["password hash", { passwordHash: "  " }],
  ])("returns a failure for a bad %s", (_field, override) => {
    const result = User.create({ ...VALID, ...override });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("User.restore", () => {
  it("rebuilds a stored row", () => {
    const user = unwrap(User.restore(VALID));
    expect(user.id).toBe(VALID.id);
    expect(user.passwordHash).toBe(VALID.passwordHash);
  });

  it("fails on a row that no longer satisfies the invariants", () => {
    expect(User.restore({ ...VALID, email: "" }).ok).toBe(false);
  });
});
