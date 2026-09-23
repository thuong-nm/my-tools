import { describe, expect, it } from "vitest";

import { isProbablyBot, viewerHasher } from "./viewer-hash";

const hash = viewerHasher("a-secret");
const VISITOR = { ip: "203.0.113.9", userAgent: "Mozilla/5.0" };

describe("viewerHasher", () => {
  it("is stable for the same visitor on the same share", () => {
    expect(hash("abc123", VISITOR)).toBe(hash("abc123", VISITOR));
  });

  it("differs per share, so a visitor cannot be followed between links", () => {
    expect(hash("abc123", VISITOR)).not.toBe(hash("def456", VISITOR));
  });

  it("separates two visitors that differ only by IP or only by user agent", () => {
    expect(hash("abc123", { ...VISITOR, ip: "203.0.113.10" })).not.toBe(hash("abc123", VISITOR));
    expect(hash("abc123", { ...VISITOR, userAgent: "Other" })).not.toBe(hash("abc123", VISITOR));
  });

  it("does not leak the address it was built from", () => {
    const digest = hash("abc123", VISITOR);

    expect(digest).not.toContain("203.0.113.9");
    expect(digest).toHaveLength(64);
  });

  it("changes with the secret, so a leaked table cannot be re-derived without it", () => {
    expect(viewerHasher("other-secret")("abc123", VISITOR)).not.toBe(hash("abc123", VISITOR));
  });

  it("cannot be collided by moving the boundary between ip and user agent", () => {
    expect(hash("abc123", { ip: "a", userAgent: "b" })).not.toBe(
      hash("abc123", { ip: "a b", userAgent: undefined }),
    );
  });
});

describe("isProbablyBot", () => {
  it("rejects link-preview fetchers that hit every shared URL", () => {
    for (const ua of [
      "Slackbot-LinkExpanding 1.0",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
      "curl/8.5.0",
      "python-requests/2.31",
    ]) {
      expect(isProbablyBot(ua), ua).toBe(true);
    }
  });

  it("treats a missing user agent as a script", () => {
    expect(isProbablyBot(undefined)).toBe(true);
    expect(isProbablyBot("")).toBe(true);
  });

  it("lets real browsers through", () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    ]) {
      expect(isProbablyBot(ua), ua).toBe(false);
    }
  });
});
