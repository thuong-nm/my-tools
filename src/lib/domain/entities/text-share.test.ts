import { describe, expect, it } from "vitest";

import { unwrap } from "../shared/result";
import { TextShare } from "./text-share";

const NOW = new Date("2026-09-09T10:00:00.000Z");
const OWNER = "9c2f7a10-0000-4000-8000-000000000001";

const VALID = {
  id: "3f1c2d4e-0000-4000-8000-000000000001",
  code: "abcdef2345",
  content: "Rhello%20world",
  format: "PLAIN",
  retention: "ONE_DAY",
  now: NOW,
};

describe("TextShare.create", () => {
  it("derives the expiry from the injected clock", () => {
    const share = unwrap(TextShare.create(VALID));
    expect(share.expiresAt.toISOString()).toBe("2026-09-10T10:00:00.000Z");
  });

  it("stamps createdAt from the same injected clock", () => {
    expect(unwrap(TextShare.create(VALID)).createdAt).toBe(NOW);
  });

  // A share saved without signing in stays anonymous, so it never reaches anyone's history.
  it("has no owner unless one is supplied", () => {
    expect(unwrap(TextShare.create(VALID)).ownerId).toBeUndefined();
    expect(unwrap(TextShare.create({ ...VALID, ownerId: OWNER })).ownerId).toBe(OWNER);
  });

  it.each([
    ["code", { code: "!!" }],
    ["content", { content: "  " }],
    ["format", { format: "AUTO" }],
    ["retention", { retention: "forever" }],
  ])("returns a failure for a bad %s", (_field, override) => {
    const result = TextShare.create({ ...VALID, ...override });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("TextShare.restore", () => {
  it("keeps the stored expiry rather than recomputing it", () => {
    const expiresAt = new Date("2020-01-01T00:00:00.000Z");
    const share = unwrap(TextShare.restore({ ...VALID, createdAt: NOW, expiresAt }));
    expect(share.expiresAt).toBe(expiresAt);
  });

  it("fails on a row that no longer satisfies the invariants", () => {
    const result = TextShare.restore({ ...VALID, content: "", createdAt: NOW, expiresAt: NOW });
    expect(result.ok).toBe(false);
  });

  it("carries the owner through when the row has one", () => {
    const share = unwrap(
      TextShare.restore({ ...VALID, createdAt: NOW, expiresAt: NOW, ownerId: OWNER }),
    );
    expect(share.ownerId).toBe(OWNER);
  });
});

describe("isExpired", () => {
  it("is false before the expiry", () => {
    const share = unwrap(TextShare.create(VALID));
    expect(share.isExpired(new Date("2026-09-10T09:59:59.999Z"))).toBe(false);
  });

  // The boundary is inclusive: at the stated instant the link is gone, not still good.
  it("is true at exactly the expiry", () => {
    const share = unwrap(TextShare.create(VALID));
    expect(share.isExpired(new Date("2026-09-10T10:00:00.000Z"))).toBe(true);
  });

  it("is true after the expiry", () => {
    const share = unwrap(TextShare.create(VALID));
    expect(share.isExpired(new Date("2026-09-11T00:00:00.000Z"))).toBe(true);
  });
});
