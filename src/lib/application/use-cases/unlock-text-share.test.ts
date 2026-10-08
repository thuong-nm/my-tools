import { describe, expect, it } from "vitest";

import { TextShare } from "@/lib/domain/entities/text-share";
import { unwrap } from "@/lib/domain/shared/result";
import { fakeTextShareRepository } from "@/lib/testing/fakes/text-share-repository";
import { getTextShare } from "./get-text-share";
import { unlockTextShare } from "./unlock-text-share";
import { updateTextShare } from "./update-text-share";

const NOW = new Date("2026-09-30T10:00:00.000Z");
const OWNER = "4e1ccd7e-7402-4aca-8fd3-c348b09a5b63";
const STRANGER = "0000ffff-0000-4000-8000-000000000000";
const PASSWORD = "open-sesame-please";

// Deliberately trivial and reversible, so a test asserts the wiring rather than scrypt.
const hashPassword = async (password: string) => `hashed:${password}`;
const verifyPassword = async (password: string, hash: string) => hash === `hashed:${password}`;

async function setup({ protect = true } = {}) {
  const shares = fakeTextShareRepository();
  await shares.create(
    unwrap(
      TextShare.create({
        id: "1f8b4c3a-1111-4aaa-8bbb-000000000001",
        code: "abcdef2345",
        content: "the secret payload",
        format: "PLAIN",
        retention: "ONE_DAY",
        now: NOW,
        ownerId: OWNER,
      }),
    ),
  );

  if (protect) {
    await updateTextShare(
      { code: "abcdef2345", ownerId: OWNER, password: PASSWORD },
      { shares, hashPassword },
    );
  }

  return {
    shares,
    read: { shares, now: () => NOW },
    unlockDeps: { shares, verifyPassword, now: () => NOW },
    writeDeps: { shares, hashPassword },
  };
}

describe("getTextShare on a protected share", () => {
  it("refuses a stranger, and the payload is not in the failure", async () => {
    const { read } = await setup();

    const result = await getTextShare({ code: "abcdef2345" }, read);

    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_LOCKED");
    expect(JSON.stringify(result)).not.toContain("the secret payload");
  });

  it("refuses a signed-in reader who is not the owner", async () => {
    const { read } = await setup();

    const result = await getTextShare({ code: "abcdef2345", viewerId: STRANGER }, read);

    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_LOCKED");
  });

  it("lets the owner straight through without a grant", async () => {
    const { read } = await setup();

    const result = await getTextShare({ code: "abcdef2345", viewerId: OWNER }, read);

    expect(result.ok && result.value.content).toBe("the secret payload");
  });

  it("lets an unlocked stranger through", async () => {
    const { read } = await setup();

    const result = await getTextShare({ code: "abcdef2345", unlocked: true }, read);

    expect(result.ok && result.value.content).toBe("the secret payload");
  });

  it("reports that it has a password, which opening the link reveals anyway", async () => {
    const { read } = await setup();

    const result = await getTextShare({ code: "abcdef2345", viewerId: OWNER }, read);

    expect(result.ok && result.value.hasPassword).toBe(true);
  });

  it("does not lock a share that has no password", async () => {
    const { read } = await setup({ protect: false });

    const result = await getTextShare({ code: "abcdef2345" }, read);

    expect(result.ok && result.value.content).toBe("the secret payload");
    expect(result.ok && "hasPassword" in result.value).toBe(false);
  });
});

describe("unlockTextShare", () => {
  it("accepts the right password", async () => {
    const { unlockDeps } = await setup();

    await expect(
      unlockTextShare({ code: "abcdef2345", password: PASSWORD }, unlockDeps),
    ).resolves.toEqual({ ok: true, value: undefined });
  });

  // One answer for every rejection, or the endpoint becomes a way to map which codes exist.
  it("gives the identical error for a wrong password, an unknown code and a malformed one", async () => {
    const { unlockDeps } = await setup();

    const wrong = await unlockTextShare({ code: "abcdef2345", password: "nope" }, unlockDeps);
    const unknown = await unlockTextShare({ code: "zzzzzzzzzz", password: PASSWORD }, unlockDeps);
    const malformed = await unlockTextShare({ code: "!!", password: PASSWORD }, unlockDeps);

    expect(wrong).toEqual(unknown);
    expect(wrong).toEqual(malformed);
    expect(!wrong.ok && wrong.error.code).toBe("INVALID_SHARE_PASSWORD");
  });

  it("refuses a share that has no password rather than admitting it is open", async () => {
    const { unlockDeps } = await setup({ protect: false });

    const result = await unlockTextShare({ code: "abcdef2345", password: "" }, unlockDeps);

    expect(!result.ok && result.error.code).toBe("INVALID_SHARE_PASSWORD");
  });
});

describe("updateTextShare password handling", () => {
  it("leaves the password alone when the field is absent", async () => {
    const { read, writeDeps } = await setup();

    const result = await updateTextShare(
      { code: "abcdef2345", ownerId: OWNER, title: "Renamed" },
      writeDeps,
    );

    // The caller is told nothing about a password it did not touch.
    expect(result.ok && "hasPassword" in result.value).toBe(false);
    const after = await getTextShare({ code: "abcdef2345" }, read);
    expect(!after.ok && after.error.code).toBe("TEXT_SHARE_LOCKED");
  });

  it("removes the password on an explicit null", async () => {
    const { read, writeDeps } = await setup();

    const result = await updateTextShare(
      { code: "abcdef2345", ownerId: OWNER, password: null },
      writeDeps,
    );

    expect(result.ok && result.value.hasPassword).toBe(false);
    const after = await getTextShare({ code: "abcdef2345" }, read);
    expect(after.ok && after.value.content).toBe("the secret payload");
  });

  // No minimum on purpose: this guards a document the owner chose to share, not an account.
  it("accepts a one-character password", async () => {
    const { read, unlockDeps, writeDeps } = await setup({ protect: false });

    const result = await updateTextShare(
      { code: "abcdef2345", ownerId: OWNER, password: "x" },
      writeDeps,
    );

    expect(result.ok && result.value.hasPassword).toBe(true);
    await expect(
      unlockTextShare({ code: "abcdef2345", password: "x" }, unlockDeps),
    ).resolves.toEqual({ ok: true, value: undefined });
    const locked = await getTextShare({ code: "abcdef2345" }, read);
    expect(!locked.ok && locked.error.code).toBe("TEXT_SHARE_LOCKED");
  });

  it("treats a blank password as removal, the same as null", async () => {
    const { read, writeDeps } = await setup();

    const result = await updateTextShare(
      { code: "abcdef2345", ownerId: OWNER, password: "" },
      writeDeps,
    );

    expect(result.ok && result.value.hasPassword).toBe(false);
    const after = await getTextShare({ code: "abcdef2345" }, read);
    expect(after.ok).toBe(true);
  });

  it("will not let a stranger set a password on somebody else's share", async () => {
    const { writeDeps } = await setup({ protect: false });

    const result = await updateTextShare(
      { code: "abcdef2345", ownerId: STRANGER, password: PASSWORD },
      writeDeps,
    );

    expect(!result.ok && result.error.code).toBe("TEXT_SHARE_NOT_FOUND");
  });
});
