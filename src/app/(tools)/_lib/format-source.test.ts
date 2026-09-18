import { describe, expect, it } from "vitest";

import { CONTENT_FORMATS } from "@/lib/domain/value-objects/content-format";
import { canFormat, formatSource } from "./format-source";

describe("formatSource", () => {
  it("indents JSON with two spaces", () => {
    const result = formatSource('{"a":1,"b":[2]}', "JSON");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("reports invalid JSON as a message for the toast", () => {
    const result = formatSource("{a:1}", "JSON");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^Invalid JSON/);
  });

  it("indents nested markup", () => {
    const result = formatSource("<a><b>text</b></a>", "XML");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("<a>\n  <b>text</b>\n</a>");
  });

  it("declines a format it cannot prettify", () => {
    expect(formatSource("hello", "PLAIN").ok).toBe(false);
    expect(formatSource("# hi", "MARKDOWN").ok).toBe(false);
  });

  it("declines an empty editor", () => {
    expect(formatSource("   ", "JSON").ok).toBe(false);
  });
});

describe("canFormat", () => {
  it("agrees with formatSource about which formats have a formatter", () => {
    for (const format of CONTENT_FORMATS) {
      expect(canFormat(format)).toBe(formatSource("{}", format).ok);
    }
  });
});
