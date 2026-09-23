import { describe, expect, it } from "vitest";

import { TextShare } from "@/lib/domain/entities/text-share";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { getTextShare } from "./get-text-share";
import { recordShareView } from "./record-share-view";

const NOW = new Date("2026-09-23T10:00:00.000Z");
const OWNER = "4e1ccd7e-7402-4aca-8fd3-c348b09a5b63";

function share(overrides: { readonly ownerId?: string; readonly now?: Date } = {}) {
  return unwrap(
    TextShare.create({
      id: "1f8b4c3a-1111-4aaa-8bbb-000000000001",
      code: "abcdef2345",
      content: "payload",
      format: "PLAIN",
      retention: "ONE_DAY",
      now: overrides.now ?? NOW,
      ...("ownerId" in overrides ? { ownerId: overrides.ownerId as string } : { ownerId: OWNER }),
    }),
  );
}

// The fake takes no seed, so rows go in through `create` — which is also how production gets them.
async function setup(seed: readonly TextShare[] = [share()]) {
  const shares = fakeTextShareRepository();
  for (const row of seed) await shares.create(row);

  return { shares, deps: { shares, now: () => NOW } };
}

describe("recordShareView", () => {
  it("counts a stranger once, however many times they come back", async () => {
    const { shares, deps } = await setup();

    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);
    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);

    await expect(shares.countUniqueViews("abcdef2345" as never)).resolves.toEqual({
      ok: true,
      value: 1,
    });
  });

  it("counts two different viewers separately", async () => {
    const { shares, deps } = await setup();

    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);
    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-b" }, deps);

    await expect(shares.countUniqueViews("abcdef2345" as never)).resolves.toEqual({
      ok: true,
      value: 2,
    });
  });

  it("does not count the owner reading their own share", async () => {
    const { shares, deps } = await setup();

    await recordShareView({ code: "abcdef2345", viewerId: OWNER, viewerHash: "owner" }, deps);

    await expect(shares.countUniqueViews("abcdef2345" as never)).resolves.toEqual({
      ok: true,
      value: 0,
    });
  });

  it("counts a signed-in reader who is not the owner", async () => {
    const { shares, deps } = await setup();

    await recordShareView(
      { code: "abcdef2345", viewerId: "somebody-else", viewerHash: "visitor-a" },
      deps,
    );

    await expect(shares.countUniqueViews("abcdef2345" as never)).resolves.toEqual({
      ok: true,
      value: 1,
    });
  });

  it("stays silent about an unknown or malformed code instead of reporting it", async () => {
    const { deps } = await setup();

    await expect(
      recordShareView({ code: "zzzzzzzzzz", viewerHash: "visitor-a" }, deps),
    ).resolves.toEqual({ ok: true, value: undefined });

    await expect(recordShareView({ code: "!!", viewerHash: "visitor-a" }, deps)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("records nothing for an expired share", async () => {
    const stale = share({ now: new Date(NOW.getTime() - 48 * 60 * 60 * 1000) });
    const { shares, deps } = await setup([stale]);

    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);

    await expect(shares.countUniqueViews("abcdef2345" as never)).resolves.toEqual({
      ok: true,
      value: 0,
    });
  });
});

describe("getTextShare view count", () => {
  it("omits the count entirely for a signed-out reader", async () => {
    const { deps } = await setup();
    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);

    const result = await getTextShare({ code: "abcdef2345" }, deps);

    expect(result.ok && "viewCount" in result.value).toBe(false);
  });

  it("omits the count for a signed-in reader who is not the owner", async () => {
    const { deps } = await setup();

    const result = await getTextShare({ code: "abcdef2345", viewerId: "somebody-else" }, deps);

    expect(result.ok && "viewCount" in result.value).toBe(false);
  });

  it("gives the owner the count", async () => {
    const { deps } = await setup();
    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-a" }, deps);
    await recordShareView({ code: "abcdef2345", viewerHash: "visitor-b" }, deps);

    const result = await getTextShare({ code: "abcdef2345", viewerId: OWNER }, deps);

    expect(result.ok && result.value.viewCount).toBe(2);
  });

  it("gives an anonymous share's reader no count, since it has no owner to be", async () => {
    const { deps } = await setup([share({ ownerId: undefined })]);

    const result = await getTextShare({ code: "abcdef2345", viewerId: OWNER }, deps);

    expect(result.ok && "viewCount" in result.value).toBe(false);
  });
});
