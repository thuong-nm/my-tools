import { afterEach, describe, expect, it, vi } from "vitest";

import { alwaysHuman, recaptchaVerifier } from "./verify-token";

const verify = recaptchaVerifier({ secretKey: "secret", minScore: 0.5 });
const INPUT = { token: "tok", action: "login" } as const;

function siteverifyAnswers(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status === 200, status, json: () => Promise.resolve(body) }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recaptchaVerifier", () => {
  it("accepts a token that clears the score for the expected action", async () => {
    siteverifyAnswers({ success: true, score: 0.9, action: "login" });

    await expect(verify(INPUT)).resolves.toEqual({ ok: true, value: { score: 0.9 } });
  });

  it("rejects a token issued for a different action, so it cannot be replayed", async () => {
    siteverifyAnswers({ success: true, score: 0.9, action: "register" });

    const result = await verify(INPUT);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("BOT_CHECK_FAILED");
  });

  it("rejects a score below the threshold and reports it for the log", async () => {
    siteverifyAnswers({ success: true, score: 0.1, action: "login" });

    const result = await verify(INPUT);

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_FAILED");
    expect(!result.ok && result.error.details).toEqual({ score: 0.1 });
  });

  it("accepts a score exactly at the threshold", async () => {
    siteverifyAnswers({ success: true, score: 0.5, action: "login" });

    await expect(verify(INPUT)).resolves.toMatchObject({ ok: true });
  });

  it("blames us, not the visitor, when the secret key is wrong", async () => {
    siteverifyAnswers({ success: false, "error-codes": ["invalid-input-secret"] });

    const result = await verify(INPUT);

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_UNAVAILABLE");
  });

  it("treats an ordinary rejection as a failed check", async () => {
    siteverifyAnswers({ success: false, "error-codes": ["timeout-or-duplicate"] });

    const result = await verify(INPUT);

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_FAILED");
  });

  it("reports the upstream as unavailable on a network error, never as a pass", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const result = await verify(INPUT);

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_UNAVAILABLE");
  });

  it("reports an unreadable siteverify body as unavailable", async () => {
    siteverifyAnswers({ unexpected: true });

    const result = await verify(INPUT);

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_UNAVAILABLE");
  });

  it("fails an empty token without calling siteverify at all", async () => {
    siteverifyAnswers({ success: true, score: 1, action: "login" });

    const result = await verify({ token: "", action: "login" });

    expect(!result.ok && result.error.code).toBe("BOT_CHECK_FAILED");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("alwaysHuman", () => {
  it("passes, so an unconfigured deployment still works", async () => {
    await expect(alwaysHuman(INPUT)).resolves.toEqual({ ok: true, value: { score: 1 } });
  });
});
