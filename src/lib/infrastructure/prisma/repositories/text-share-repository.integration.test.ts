import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTextShare } from "@/lib/application/use-cases/create-text-share";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { TextShare } from "@/lib/domain/entities/text-share";
import { unwrap } from "@/lib/domain/shared/result";
import { shareCode } from "@/lib/domain/value-objects/share-code";
import { createPrismaClient, disconnectPrismaClient } from "../client";
import { textShareRepository } from "./text-share-repository";

// Wired with the PRODUCTION adapter, not a fake: an in-memory repository cannot model a unique
// violation, so the retry loop below is the only place that behaviour is actually proven.
const db = createPrismaClient({
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: false,
});

const shares = textShareRepository(db);
const NOW = new Date("2026-09-09T10:00:00.000Z");

let idCounter = 0;
const generateId = () =>
  `3f1c2d4e-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

beforeEach(async () => {
  await db.textShare.deleteMany();
  idCounter = 0;
});

afterAll(async () => {
  await db.textShare.deleteMany();
  await disconnectPrismaClient();
});

describe("textShareRepository", () => {
  it("round-trips a share through Postgres", async () => {
    const share = unwrap(
      TextShare.create({
        id: generateId(),
        code: "abcdef2345",
        content: "Rhello%20world",
        format: "MARKDOWN",
        retention: "ONE_WEEK",
        now: NOW,
      }),
    );

    expect((await shares.create(share)).ok).toBe(true);

    const found = unwrap(await shares.findByCode(share.code));
    expect(found?.content).toBe("Rhello%20world");
    expect(found?.format).toBe("MARKDOWN");
    expect(found?.expiresAt.toISOString()).toBe("2026-09-16T10:00:00.000Z");
  });

  it("answers REPOSITORY_CONFLICT for a taken code", async () => {
    const first = unwrap(
      TextShare.create({
        id: generateId(),
        code: "abcdef2345",
        content: "Rone",
        format: "PLAIN",
        retention: "ONE_DAY",
        now: NOW,
      }),
    );
    const second = unwrap(
      TextShare.create({
        id: generateId(),
        code: "abcdef2345",
        content: "Rtwo",
        format: "PLAIN",
        retention: "ONE_DAY",
        now: NOW,
      }),
    );

    expect((await shares.create(first)).ok).toBe(true);

    const clash = await shares.create(second);
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.error.code).toBe("REPOSITORY_CONFLICT");
  });

  it("answers undefined, not a failure, for an unknown code", async () => {
    const found = await shares.findByCode(unwrap(shareCode("nothere234")));
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value).toBeUndefined();
  });
});

describe("the use cases against the real adapter", () => {
  const deps = {
    shares,
    now: () => NOW,
    generateId,
    generateShareCode: () => "abcdef2345",
  };

  it("creates then reads back a share", async () => {
    const created = await createTextShare(
      { content: "Rhello", format: "JSON", retention: "ONE_MONTH" },
      deps,
    );

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const read = await getTextShare({ code: created.value.code }, { shares, now: () => NOW });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value).toEqual(created.value);
  });

  // The same code twice: the second call must survive the unique violation and land on a new
  // code. A fake cannot prove this — a failed statement aborts the whole Postgres transaction.
  it("recovers from a real unique violation by generating another code", async () => {
    const codes = ["abcdef2345", "abcdef2345", "zzzzz23456"];
    let attempt = 0;

    const input = { content: "Rhello", format: "PLAIN", retention: "ONE_DAY" } as const;

    const first = await createTextShare(input, { ...deps, generateShareCode: () => codes[0]! });
    expect(first.ok).toBe(true);

    const second = await createTextShare(input, {
      ...deps,
      generateShareCode: () => codes[++attempt]!,
    });

    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.code).toBe("zzzzz23456");
  });

  it("reports an expired share as expired", async () => {
    const created = await createTextShare(
      { content: "Rhello", format: "PLAIN", retention: "ONE_DAY" },
      deps,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const later = new Date("2026-09-20T10:00:00.000Z");
    const read = await getTextShare({ code: created.value.code }, { shares, now: () => later });

    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error.code).toBe("TEXT_SHARE_EXPIRED");
  });
});
