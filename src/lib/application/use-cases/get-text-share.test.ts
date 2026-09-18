import { describe, expect, it } from "vitest";

import { TextShare } from "@/lib/domain/entities/text-share";
import { domainError } from "@/lib/domain/errors/domain-error";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { getTextShare } from "./get-text-share";

const NOW = new Date("2026-09-09T10:00:00.000Z");

function storedShare() {
  return unwrap(
    TextShare.create({
      id: "3f1c2d4e-0000-4000-8000-000000000001",
      code: "abcdef2345",
      content: "Rhello",
      format: "MARKDOWN",
      retention: "ONE_DAY",
      now: NOW,
    }),
  );
}

describe("getTextShare", () => {
  it("returns the share while it is live", async () => {
    const shares = fakeTextShareRepository();
    await shares.create(storedShare());

    const result = await getTextShare({ code: "abcdef2345" }, { shares, now: () => NOW });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.format).toBe("MARKDOWN");
  });

  it("rejects a malformed code without a query", async () => {
    const shares = fakeTextShareRepository();
    const result = await getTextShare({ code: "../etc/passwd" }, { shares, now: () => NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED");
  });

  it("reports an unknown code as not found", async () => {
    const shares = fakeTextShareRepository();
    const result = await getTextShare({ code: "missing234" }, { shares, now: () => NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TEXT_SHARE_NOT_FOUND");
  });

  // Reported, not deleted: a read that writes turns every page view into a transaction.
  it("reports an expired share and leaves the row in place", async () => {
    const shares = fakeTextShareRepository();
    await shares.create(storedShare());

    const later = new Date("2026-09-11T10:00:00.000Z");
    const result = await getTextShare({ code: "abcdef2345" }, { shares, now: () => later });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TEXT_SHARE_EXPIRED");
    expect(shares.rows.size).toBe(1);
  });

  it("passes a repository failure through unchanged", async () => {
    const shares = fakeTextShareRepository();
    shares.failEveryRead(domainError("REPOSITORY_CORRUPT_ROW", "stale row"));

    const result = await getTextShare({ code: "abcdef2345" }, { shares, now: () => NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPOSITORY_CORRUPT_ROW");
  });
});
