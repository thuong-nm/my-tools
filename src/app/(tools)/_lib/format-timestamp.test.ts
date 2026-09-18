import { describe, expect, it } from "vitest";

import { formatTimestamp } from "./format-timestamp";

const ISO = "2026-09-17T02:05:00.000Z";

describe("formatTimestamp", () => {
  it("renders an ISO instant in the requested zone", () => {
    expect(formatTimestamp(ISO, "UTC")).toBe("17/09/2026, 02:05");
  });

  // The stored instant is UTC; the zone decides which day the owner sees it fall on.
  it("shifts the day when the zone pushes it across midnight", () => {
    expect(formatTimestamp(ISO, "Asia/Ho_Chi_Minh")).toBe("17/09/2026, 09:05");
    expect(formatTimestamp("2026-09-16T23:30:00.000Z", "Asia/Ho_Chi_Minh")).toBe(
      "17/09/2026, 06:30",
    );
  });

  // `month: "short"` would render "Sep" or "Sept" depending on the ICU build Node ships with.
  it("stays stable across ICU versions by avoiding month names", () => {
    expect(formatTimestamp(ISO, "UTC")).not.toMatch(/[A-Za-z]/);
  });

  it("uses a 24-hour clock so 13:00 never reads as 01:00", () => {
    expect(formatTimestamp("2026-09-17T13:00:00.000Z", "UTC")).toBe("17/09/2026, 13:00");
  });
});
