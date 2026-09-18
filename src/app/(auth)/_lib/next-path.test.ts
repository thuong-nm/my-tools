import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each(["/history", "/s/abcdef2345", "/history?limit=10"])("keeps the same-origin path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  // Anything that can leave our origin sends the visitor somewhere else with a fresh session.
  it.each([
    ["an absolute URL", "https://evil.example.com"],
    ["a protocol-relative host", "//evil.example.com"],
    ["a backslash host", "/\\evil.example.com"],
    ["a scheme-only value", "javascript:alert(1)"],
    ["a bare path", "history"],
    ["an empty value", ""],
  ])("falls back home for %s", (_label, raw) => {
    expect(safeNextPath(raw)).toBe("/");
  });

  it("falls back home when the parameter is absent or repeated", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/history", "/other"])).toBe("/history");
  });
});
