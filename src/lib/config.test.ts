import { describe, expect, it } from "vitest";

import { ConfigError, parseServerConfig } from "./config";

const BASE = {
  DATABASE_URL: "postgresql://app:app@localhost:5433/app?schema=public",
  SESSION_SECRET: "a-development-session-secret-at-least-32-chars",
} as const;

describe("CORS_ALLOWED_ORIGINS", () => {
  it("defaults to same-origin only", () => {
    expect(parseServerConfig(BASE).cors.allowedOrigins).toEqual([]);
    expect(parseServerConfig({ ...BASE, CORS_ALLOWED_ORIGINS: "" }).cors.allowedOrigins).toEqual(
      [],
    );
  });

  it("splits on commas and tolerates surrounding whitespace", () => {
    const config = parseServerConfig({
      ...BASE,
      CORS_ALLOWED_ORIGINS: "https://acme.com,  https://app.acme.com ",
    });

    expect(config.cors.allowedOrigins).toEqual(["https://acme.com", "https://app.acme.com"]);
  });

  // A trailing slash or a path would never match the browser's `Origin` header.
  it("normalises an entry to a bare origin", () => {
    const config = parseServerConfig({
      ...BASE,
      CORS_ALLOWED_ORIGINS: "https://acme.com/,https://app.acme.com/callback",
    });

    expect(config.cors.allowedOrigins).toEqual(["https://acme.com", "https://app.acme.com"]);
  });

  it("keeps a non-default port, which is part of an origin", () => {
    const config = parseServerConfig({ ...BASE, CORS_ALLOWED_ORIGINS: "http://localhost:5173" });

    expect(config.cors.allowedOrigins).toEqual(["http://localhost:5173"]);
  });

  it("fails startup on an entry that is not a URL rather than never matching", () => {
    expect(() => parseServerConfig({ ...BASE, CORS_ALLOWED_ORIGINS: "acme.com" })).toThrow(
      ConfigError,
    );
  });
});

describe("SESSION_SECRET", () => {
  it("is required: without it every session cookie would be signed with nothing", () => {
    const { SESSION_SECRET: _omitted, ...withoutSecret } = BASE;
    expect(() => parseServerConfig(withoutSecret)).toThrow(ConfigError);
  });

  // A blank value in `.env` means "not set", so it must fail the same way an absent one does.
  it.each([["blank", ""], ["too short", "not-long-enough"]])(
    "rejects a %s secret at startup rather than at the first sign-in",
    (_label, secret) => {
      expect(() => parseServerConfig({ ...BASE, SESSION_SECRET: secret })).toThrow(ConfigError);
    },
  );
});

describe("RECAPTCHA group", () => {
  const KEYS = { RECAPTCHA_SITE_KEY: "site", RECAPTCHA_SECRET_KEY: "secret" };

  it("is off when both halves are absent or blank", () => {
    expect(parseServerConfig(BASE).recaptcha).toEqual({ enabled: false });
    expect(
      parseServerConfig({ ...BASE, RECAPTCHA_SITE_KEY: "", RECAPTCHA_SECRET_KEY: "" }).recaptcha,
    ).toEqual({ enabled: false });
  });

  it("is on with a default score when both halves are present", () => {
    expect(parseServerConfig({ ...BASE, ...KEYS }).recaptcha).toEqual({
      enabled: true,
      siteKey: "site",
      secretKey: "secret",
      minScore: 0.5,
    });
  });

  it("fails loudly on a half-filled group rather than silently disabling the check", () => {
    for (const half of [{ RECAPTCHA_SITE_KEY: "site" }, { RECAPTCHA_SECRET_KEY: "secret" }]) {
      expect(() => parseServerConfig({ ...BASE, ...half })).toThrow(ConfigError);
    }
  });

  it("rejects a score outside 0..1, which would switch the check off or on for everyone", () => {
    expect(() => parseServerConfig({ ...BASE, ...KEYS, RECAPTCHA_MIN_SCORE: "1.5" })).toThrow(
      ConfigError,
    );
    expect(() => parseServerConfig({ ...BASE, ...KEYS, RECAPTCHA_MIN_SCORE: "-1" })).toThrow(
      ConfigError,
    );
  });
});
