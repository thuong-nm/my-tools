import { describe, expect, it } from "vitest";

import { decodeBase64, encodeBase64 } from "./base64";

describe("encodeBase64", () => {
  it("uses the standard alphabet with padding", () => {
    expect(encodeBase64("hi?~", false)).toBe("aGk/fg==");
  });

  it("uses the url-safe alphabet and drops padding", () => {
    expect(encodeBase64("hi?~", true)).toBe("aGk_fg");
  });

  it("round-trips multibyte text", () => {
    const text = "Xin chào — ✨";

    expect(decodeBase64(encodeBase64(text, false))).toEqual({ ok: true, value: text });
    expect(decodeBase64(encodeBase64(text, true))).toEqual({ ok: true, value: text });
  });
});

describe("decodeBase64", () => {
  it("accepts either alphabet, padded or not", () => {
    for (const encoded of ["aGk/fg==", "aGk_fg", "aGk/fg"]) {
      expect(decodeBase64(encoded)).toEqual({ ok: true, value: "hi?~" });
    }
  });

  it("ignores whitespace, so a wrapped value pasted from a terminal still decodes", () => {
    expect(decodeBase64("aGVs\nbG8g\td29ybGQ=")).toEqual({ ok: true, value: "hello world" });
  });

  it("reports an empty input rather than returning an empty string", () => {
    expect(decodeBase64("   ")).toEqual({ ok: false, error: "There is nothing to decode." });
  });

  it("reports bytes that are not UTF-8 instead of replacing them with U+FFFD", () => {
    // 0xFF is never a valid UTF-8 lead byte.
    const result = decodeBase64(Buffer.from([0xff, 0xfe]).toString("base64"));

    expect(result.ok).toBe(false);
  });

  it("reports a value that is not Base64 at all", () => {
    expect(decodeBase64("not base64!!").ok).toBe(false);
  });
});
