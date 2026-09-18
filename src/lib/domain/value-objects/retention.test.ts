import { describe, expect, it } from "vitest";

import { expiryFrom, retention } from "./retention";

// Runs with no framework, no database and no network — see AGENTS.md "Enforcement".
describe("retention", () => {
  it("runs outside a browser", () => {
    expect(typeof window).toBe("undefined");
  });

  it("accepts every published window", () => {
    for (const value of ["ONE_DAY", "ONE_WEEK", "ONE_MONTH", "ONE_YEAR"]) {
      expect(retention(value).ok).toBe(true);
    }
  });

  it("rejects the wire spelling used by the standalone tool", () => {
    const result = retention("1day");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("expiryFrom", () => {
  const now = new Date("2026-09-09T10:00:00.000Z");

  it.each([
    ["ONE_DAY", "2026-09-10T10:00:00.000Z"],
    ["ONE_WEEK", "2026-09-16T10:00:00.000Z"],
    ["ONE_MONTH", "2026-10-09T10:00:00.000Z"],
    ["ONE_YEAR", "2027-09-09T10:00:00.000Z"],
  ] as const)("adds %s", (window, expected) => {
    expect(expiryFrom(now, window).toISOString()).toBe(expected);
  });

  it("leaves `now` untouched", () => {
    expiryFrom(now, "ONE_YEAR");
    expect(now.toISOString()).toBe("2026-09-09T10:00:00.000Z");
  });
});
