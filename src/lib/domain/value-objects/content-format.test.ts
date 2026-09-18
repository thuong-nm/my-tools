import { describe, expect, it } from "vitest";

import { CONTENT_FORMATS, contentFormat } from "./content-format";

describe("contentFormat", () => {
  it.each(CONTENT_FORMATS)("accepts %s", (format) => {
    expect(contentFormat(format).ok).toBe(true);
  });

  // The editor resolves "Auto detect" before anything is stored, so it must not be a format.
  it("rejects AUTO", () => {
    expect(contentFormat("AUTO").ok).toBe(false);
  });

  it("rejects the lowercase spelling used by the standalone tool", () => {
    expect(contentFormat("json").ok).toBe(false);
  });
});
