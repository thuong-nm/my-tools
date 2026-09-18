import { describe, expect, it } from "vitest";

import { TextShare } from "@/lib/domain/entities/text-share";
import { domainError } from "@/lib/domain/errors/domain-error";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { listUserShares, MAX_HISTORY_LIMIT } from "./list-user-shares";

const NOW = new Date("2026-09-09T10:00:00.000Z");
const OWNER = "9c2f7a10-0000-4000-8000-000000000001";
const OTHER = "9c2f7a10-0000-4000-8000-000000000002";

// Presence, not `??`: an explicit `ownerId: undefined` means "anonymous", and a nullish
// fallback would quietly hand it back to OWNER.
function share(overrides: { code: string; at: Date; ownerId?: string; retention?: string }) {
  const ownerId = "ownerId" in overrides ? overrides.ownerId : OWNER;

  return unwrap(
    TextShare.create({
      id: `3f1c2d4e-0000-4000-8000-${overrides.code.padStart(12, "0")}`,
      code: overrides.code,
      content: "Rhello",
      format: "PLAIN",
      retention: overrides.retention ?? "ONE_WEEK",
      now: overrides.at,
      ownerId,
    }),
  );
}

async function seeded(...shares: readonly TextShare[]) {
  const repository = fakeTextShareRepository();
  for (const one of shares) await repository.create(one);
  return repository;
}

describe("listUserShares", () => {
  it("returns the owner's shares newest first", async () => {
    const shares = await seeded(
      share({ code: "older23456", at: new Date("2026-09-01T10:00:00.000Z") }),
      share({ code: "newer23456", at: new Date("2026-09-08T10:00:00.000Z") }),
    );

    const result = await listUserShares({ ownerId: OWNER }, { shares, now: () => NOW });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((row) => row.code)).toEqual(["newer23456", "older23456"]);
  });

  it("never returns another account's shares", async () => {
    const shares = await seeded(
      share({ code: "mine234567", at: NOW }),
      share({ code: "theirs2345", at: NOW, ownerId: OTHER }),
      share({ code: "nobody2345", at: NOW, ownerId: undefined }),
    );

    const result = await listUserShares({ ownerId: OWNER }, { shares, now: () => NOW });

    if (!result.ok) throw new Error("expected a listing");
    expect(result.value.map((row) => row.code)).toEqual(["mine234567"]);
  });

  it("omits the compressed payload from a history row", async () => {
    const shares = await seeded(share({ code: "abcdef2345", at: NOW }));

    const result = await listUserShares({ ownerId: OWNER }, { shares, now: () => NOW });

    if (!result.ok) throw new Error("expected a listing");
    expect(result.value[0]).not.toHaveProperty("content");
  });

  // Decided here rather than in the browser: a device with a skewed clock would otherwise
  // disagree with the link it is about to open.
  it("flags an expired share server-side instead of dropping it", async () => {
    const shares = await seeded(
      share({ code: "expired234", at: new Date("2026-01-01T10:00:00.000Z"), retention: "ONE_DAY" }),
      share({ code: "live234567", at: NOW }),
    );

    const result = await listUserShares({ ownerId: OWNER }, { shares, now: () => NOW });

    if (!result.ok) throw new Error("expected a listing");
    expect(result.value.map((row) => [row.code, row.expired])).toEqual([
      ["live234567", false],
      ["expired234", true],
    ]);
  });

  it.each([
    ["a caller-supplied limit", 1, 1],
    ["an absurd limit", 10_000, 3],
    ["a nonsense limit", Number.NaN, 3],
  ])("honours %s without trusting it", async (_label, limit, expected) => {
    const shares = await seeded(
      share({ code: "aaa2345678", at: new Date("2026-09-03T10:00:00.000Z") }),
      share({ code: "bbb2345678", at: new Date("2026-09-02T10:00:00.000Z") }),
      share({ code: "ccc2345678", at: new Date("2026-09-01T10:00:00.000Z") }),
    );

    const result = await listUserShares({ ownerId: OWNER, limit }, { shares, now: () => NOW });

    if (!result.ok) throw new Error("expected a listing");
    expect(result.value.length).toBe(expected);
  });

  it("never asks the repository for more than the cap", async () => {
    const shares = await seeded(share({ code: "abcdef2345", at: NOW }));
    let asked = 0;

    await listUserShares(
      { ownerId: OWNER, limit: 10_000 },
      {
        shares: {
          ...shares,
          listByOwner: async (ownerId, limit) => {
            asked = limit;
            return shares.listByOwner(ownerId, limit);
          },
        },
        now: () => NOW,
      },
    );

    expect(asked).toBe(MAX_HISTORY_LIMIT);
  });

  it("passes a repository failure through", async () => {
    const shares = await seeded();
    shares.failEveryRead(domainError("REPOSITORY_UNAVAILABLE", "down"));

    const result = await listUserShares({ ownerId: OWNER }, { shares, now: () => NOW });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPOSITORY_UNAVAILABLE");
  });
});
