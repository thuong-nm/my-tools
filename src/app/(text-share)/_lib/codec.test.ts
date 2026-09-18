import { describe, expect, it } from "vitest";

import { compress, decompress } from "./codec";

// `CompressionStream` is a platform global, so this runs in plain Node with no browser.
describe("codec", () => {
  it.each([
    ["ascii", "hello world"],
    ["vietnamese", "Chào bạn, đây là một đoạn văn bản tiếng Việt."],
    ["json", JSON.stringify({ a: [1, 2, 3], b: { c: "d" } })],
    ["repetitive", "abc".repeat(5000)],
    ["url unsafe", "a=1&b=2 #hash /slash? %25"],
  ])("round-trips %s", async (_name, text) => {
    expect(await decompress(await compress(text))).toBe(text);
  });

  it("round-trips a payload larger than the argument limit of String.fromCharCode", async () => {
    const text = Array.from({ length: 200_000 }, (_, i) => String(i % 10)).join("");
    expect(await decompress(await compress(text))).toBe(text);
  });

  it("leaves short text uncompressed, where deflate would only add overhead", async () => {
    expect(await compress("hi")).toBe("Rhi");
  });

  it("deflates text that actually compresses", async () => {
    expect(await compress("abc".repeat(500))).toMatch(/^Z/);
  });

  it("encodes an empty editor as an empty payload", async () => {
    expect(await compress("")).toBe("");
    expect(await decompress("")).toBe("");
  });

  it("answers null for a prefix it does not know, such as the old lz-string links", async () => {
    expect(await decompress("LN4IgFghg")).toBeNull();
  });

  it("answers null rather than throwing on a corrupt payload", async () => {
    expect(await decompress("Znot-real-deflate")).toBeNull();
    expect(await decompress("R%%%")).toBeNull();
  });
});
