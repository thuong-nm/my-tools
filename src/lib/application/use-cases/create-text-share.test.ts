import { describe, expect, it, vi } from "vitest";

import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { domainError } from "@/lib/domain/errors/domain-error";
import { createTextShare } from "./create-text-share";

const NOW = new Date("2026-09-09T10:00:00.000Z");

const INPUT = { content: "Rhello", format: "PLAIN", retention: "ONE_WEEK" };
const OWNER = "9c2f7a10-0000-4000-8000-000000000001";

function deps(shares = fakeTextShareRepository(), codes = ["abcdef2345"]) {
  const queue = [...codes];
  return {
    shares,
    now: () => NOW,
    generateId: () => "3f1c2d4e-0000-4000-8000-000000000001",
    generateShareCode: () => queue.shift() ?? "fallback99",
  };
}

describe("createTextShare", () => {
  it("returns a DTO carrying the code and the computed expiry", async () => {
    const result = await createTextShare(INPUT, deps());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      code: "abcdef2345",
      content: "Rhello",
      format: "PLAIN",
      createdAtUtc: "2026-09-09T10:00:00.000Z",
      expiresAtUtc: "2026-09-16T10:00:00.000Z",
    });
  });

  // The owner arrives from a verified session, so a share saved while signed out must not
  // silently acquire one.
  it("records the owner only when the caller has a session", async () => {
    const shares = fakeTextShareRepository();
    await createTextShare(INPUT, deps(shares));
    await createTextShare({ ...INPUT, ownerId: OWNER }, deps(shares, ["bbbbbb2345"]));

    expect([...shares.rows.values()].map((share) => share.ownerId)).toEqual([undefined, OWNER]);
  });

  it("rejects bad input before touching the repository", async () => {
    const shares = fakeTextShareRepository();
    const result = await createTextShare({ ...INPUT, content: "" }, deps(shares));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
    expect(shares.rows.size).toBe(0);
  });

  // The unique index is the lock, so a taken code comes back as a conflict and the use case
  // simply tries another one.
  it("generates a new code and retries on conflict", async () => {
    const shares = fakeTextShareRepository();
    shares.failNextCreates(2);

    const result = await createTextShare(INPUT, deps(shares, ["one2345678", "two2345678", "three23456"]));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.code).toBe("three23456");
  });

  it("gives up as our own failure, not the caller's, once attempts run out", async () => {
    const shares = fakeTextShareRepository();
    shares.failNextCreates(99);

    const result = await createTextShare(INPUT, deps(shares));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SHARE_CODE_EXHAUSTED");
  });

  it("returns a non-conflict repository failure immediately", async () => {
    const shares = fakeTextShareRepository();
    const unavailable = domainError("REPOSITORY_UNAVAILABLE", "down");
    const create = vi.fn(async () => ({ ok: false as const, error: unavailable }));

    const result = await createTextShare(INPUT, { ...deps(shares), shares: { ...shares, create } });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPOSITORY_UNAVAILABLE");
  });
});
