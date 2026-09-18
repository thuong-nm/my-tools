import { describe, expect, it } from "vitest";

import { MAX_SHARED_TEXT_LENGTH, sharedText } from "./shared-text";

describe("sharedText", () => {
  it("accepts a compressed payload", () => {
    expect(sharedText("Zc3ZKzMxLQ").ok).toBe(true);
  });

  it.each(["", "   ", "\n\t"])("rejects the blank payload %j", (value) => {
    expect(sharedText(value).ok).toBe(false);
  });

  it("accepts exactly the maximum length", () => {
    expect(sharedText("a".repeat(MAX_SHARED_TEXT_LENGTH)).ok).toBe(true);
  });

  it("rejects one character past the maximum", () => {
    const result = sharedText("a".repeat(MAX_SHARED_TEXT_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.details?.fieldErrors).toBeDefined();
  });
});
