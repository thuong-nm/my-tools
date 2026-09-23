import { describe, expect, it } from "vitest";

import { TextShare } from "@/lib/domain/entities/text-share";
import { unwrap } from "@/lib/domain/shared/result";
import { MAX_SHARE_TITLE_LENGTH } from "@/lib/domain/value-objects/share-title";
import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { getTextShare } from "./get-text-share";
import { renameTextShare } from "./rename-text-share";

const NOW = new Date("2026-09-23T10:00:00.000Z");
const OWNER = "4e1ccd7e-7402-4aca-8fd3-c348b09a5b63";
const STRANGER = "0000ffff-0000-4000-8000-000000000000";

// A flag, not an optional ownerId: `setup(undefined)` would trigger the default parameter and
// quietly build an OWNED share, which is exactly the case this helper exists to vary.
async function setup({ anonymous = false } = {}) {
  const shares = fakeTextShareRepository();
  await shares.create(
    unwrap(
      TextShare.create({
        id: "1f8b4c3a-1111-4aaa-8bbb-000000000001",
        code: "abcdef2345",
        content: "payload",
        format: "PLAIN",
        retention: "ONE_DAY",
        now: NOW,
        ...(anonymous ? {} : { ownerId: OWNER }),
      }),
    ),
  );

  return { shares, deps: { shares }, read: { shares, now: () => NOW } };
}

describe("renameTextShare", () => {
  it("sets a title the owner can read back", async () => {
    const { deps, read } = await setup();

    const renamed = await renameTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "  Release   notes  " },
      deps,
    );

    // Whitespace is collapsed rather than rejected, so a pasted heading just works.
    expect(renamed).toEqual({ ok: true, value: "Release notes" });

    const read1 = await getTextShare({ code: "abcdef2345" }, read);
    expect(read1.ok && read1.value.title).toBe("Release notes");
  });

  it("is public — a signed-out reader gets the title", async () => {
    const { deps, read } = await setup();
    await renameTextShare({ code: "abcdef2345", ownerId: OWNER, title: "Public name" }, deps);

    const result = await getTextShare({ code: "abcdef2345" }, read);

    expect(result.ok && result.value.title).toBe("Public name");
  });

  it("clears the title when given a blank one", async () => {
    const { deps, read } = await setup();
    await renameTextShare({ code: "abcdef2345", ownerId: OWNER, title: "Temporary" }, deps);

    const cleared = await renameTextShare({ code: "abcdef2345", ownerId: OWNER, title: "   " }, deps);

    expect(cleared).toEqual({ ok: true, value: undefined });
    const result = await getTextShare({ code: "abcdef2345" }, read);
    expect(result.ok && "title" in result.value).toBe(false);
  });

  it("answers NOT_FOUND for somebody else's share, never FORBIDDEN", async () => {
    const { deps } = await setup();

    const result = await renameTextShare(
      { code: "abcdef2345", ownerId: STRANGER, title: "Mine now" },
      deps,
    );

    // FORBIDDEN would confirm the code exists, turning this into a probe for live codes.
    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_NOT_FOUND");
  });

  it("answers NOT_FOUND for an anonymous share, which has no owner to be", async () => {
    const { deps } = await setup({ anonymous: true });

    const result = await renameTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "Claiming this" },
      deps,
    );

    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_NOT_FOUND");
  });

  it("answers NOT_FOUND for a code that does not exist", async () => {
    const { deps } = await setup();

    const result = await renameTextShare(
      { code: "zzzzzzzzzz", ownerId: OWNER, title: "Nothing" },
      deps,
    );

    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_NOT_FOUND");
  });

  it("rejects a title past the cap, and accepts one exactly at it", async () => {
    const { deps } = await setup();

    const tooLong = await renameTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "x".repeat(MAX_SHARE_TITLE_LENGTH + 1) },
      deps,
    );
    expect(!tooLong.ok && tooLong.error.code).toBe("VALIDATION_FAILED");

    const atCap = await renameTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "x".repeat(MAX_SHARE_TITLE_LENGTH) },
      deps,
    );
    expect(atCap.ok).toBe(true);
  });

  it("strips control characters instead of storing a title with a newline in it", async () => {
    const { deps } = await setup();

    const result = await renameTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "Line one\nLine two\tend" },
      deps,
    );

    expect(result).toEqual({ ok: true, value: "Line one Line two end" });
  });
});
