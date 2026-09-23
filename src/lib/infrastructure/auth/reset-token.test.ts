import { describe, expect, it } from "vitest";

import { generateResetToken, hashResetToken } from "./reset-token";

describe("generateResetToken", () => {
  it("returns the hash of its own token", () => {
    const { token, tokenHash } = generateResetToken();

    expect(tokenHash).toBe(hashResetToken(token));
  });

  it("is url-safe, so it survives being put in a link", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateResetToken().token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateResetToken().token));

    expect(tokens.size).toBe(200);
  });

  it("hashes to something that does not contain the token", () => {
    const { token, tokenHash } = generateResetToken();

    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toHaveLength(64);
  });
});
