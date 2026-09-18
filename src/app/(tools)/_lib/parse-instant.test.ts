import { describe, expect, it } from "vitest";

import { parseInstant, toRelative, toUnixSeconds } from "./parse-instant";

describe("parseInstant", () => {
  it("reads a 10-digit number as seconds", () => {
    const result = parseInstant("1700000000");

    expect(result.ok && result.value.source).toBe("seconds");
    expect(result.ok && result.value.date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("reads a 13-digit number as milliseconds", () => {
    const result = parseInstant("1700000000123");

    expect(result.ok && result.value.source).toBe("milliseconds");
    expect(result.ok && result.value.date.toISOString()).toBe("2023-11-14T22:13:20.123Z");
  });

  it("reads an ISO 8601 string", () => {
    const result = parseInstant("2023-11-14T22:13:20Z");

    expect(result.ok && result.value.source).toBe("iso");
    expect(result.ok && result.value.date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("accepts 0 and negative seconds, so the epoch and earlier still convert", () => {
    expect(parseInstant("0").ok && parseInstant("0")).toMatchObject({
      value: { source: "seconds" },
    });

    const before = parseInstant("-86400");
    expect(before.ok && before.value.date.toISOString()).toBe("1969-12-31T00:00:00.000Z");
  });

  it("reports unparseable input instead of returning an Invalid Date", () => {
    expect(parseInstant("tomorrow").ok).toBe(false);
    expect(parseInstant("   ").ok).toBe(false);
  });

  it("treats 11 digits as seconds, far future and all", () => {
    const result = parseInstant("99999999999");

    expect(result.ok && result.value.source).toBe("seconds");
    expect(result.ok && result.value.date.getUTCFullYear()).toBe(5138);
  });

  it("rejects a number with more digits than either form allows", () => {
    expect(parseInstant("999999999999999").ok).toBe(false);
  });
});

describe("toUnixSeconds", () => {
  it("truncates towards zero so a pre-1970 instant does not gain a second", () => {
    expect(toUnixSeconds(new Date("1969-12-31T23:59:59.500Z"))).toBe(-1);
    expect(toUnixSeconds(new Date("1970-01-01T00:00:00.500Z"))).toBe(0);
  });
});

describe("toRelative", () => {
  const now = new Date("2023-11-14T22:13:20.000Z");

  it("picks the largest unit that fits, in both directions", () => {
    expect(toRelative(new Date("2023-11-14T21:13:20.000Z"), now)).toBe("1 hour ago");
    expect(toRelative(new Date("2023-11-16T22:13:20.000Z"), now)).toBe("in 2 days");
  });

  it("says 'now' rather than '0 seconds ago'", () => {
    expect(toRelative(now, now)).toBe("now");
  });
});
