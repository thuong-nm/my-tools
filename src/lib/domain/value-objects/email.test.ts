import { describe, expect, it } from "vitest";

import { unwrap } from "../shared/result";
import { email, MAX_EMAIL_LENGTH } from "./email";

describe("email", () => {
  it("normalises case and surrounding whitespace", () => {
    expect(unwrap(email("  Nguyen.Thuong@Example.COM  "))).toBe("nguyen.thuong@example.com");
  });

  it.each([
    "a@b.co",
    "first.last+tag@sub.example.com",
    "user@example.travel",
  ])("accepts %s", (value) => {
    expect(email(value).ok).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["no at sign", "nobody.example.com"],
    ["no domain dot", "nobody@example"],
    ["two at signs", "a@b@example.com"],
    ["inner space", "no body@example.com"],
    ["trailing dot", "nobody@example."],
  ])("rejects %s", (_label, value) => {
    const result = email(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects an address past the RFC length limit", () => {
    const local = "a".repeat(MAX_EMAIL_LENGTH);
    expect(email(`${local}@example.com`).ok).toBe(false);
  });

  it("reports the failing field so a form can render it inline", () => {
    const result = email("nope");
    if (result.ok) throw new Error("expected a failure");
    expect(result.error.details?.fieldErrors).toHaveProperty("email");
  });
});
