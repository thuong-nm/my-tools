import { describe, expect, it } from "vitest";

import { SHARE_CODE_ALPHABET, SHARE_CODE_LENGTH, shareCode } from "./share-code";

describe("shareCode", () => {
  it("accepts what the generator's alphabet can produce", () => {
    const generated = SHARE_CODE_ALPHABET.slice(0, SHARE_CODE_LENGTH);
    expect(shareCode(generated).ok).toBe(true);
  });

  it.each(["", "abc", "ABCDEF", "abc-def", "abc def", "a".repeat(33)])(
    "rejects %j",
    (value) => {
      expect(shareCode(value).ok).toBe(false);
    },
  );

  it("has no lookalike glyphs in the generation alphabet", () => {
    for (const glyph of ["0", "o", "1", "l", "i"]) {
      expect(SHARE_CODE_ALPHABET).not.toContain(glyph);
    }
  });
});
