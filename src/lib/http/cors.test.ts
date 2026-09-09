import { describe, expect, it } from "vitest";

import { corsHeaders, corsPreflightHeaders, isAllowedOrigin } from "./cors";

const ALLOWED = ["https://acme.com", "https://app.acme.com"] as const;

describe("isAllowedOrigin", () => {
  it("matches an exact origin", () => {
    expect(isAllowedOrigin("https://acme.com", ALLOWED)).toBe(true);
  });

  it("rejects a different scheme, host or port", () => {
    expect(isAllowedOrigin("http://acme.com", ALLOWED)).toBe(false);
    expect(isAllowedOrigin("https://evil-acme.com", ALLOWED)).toBe(false);
    expect(isAllowedOrigin("https://acme.com:8443", ALLOWED)).toBe(false);
  });

  it("rejects a missing origin and the literal string sent by a sandboxed context", () => {
    expect(isAllowedOrigin(null, ALLOWED)).toBe(false);
    expect(isAllowedOrigin("null", ALLOWED)).toBe(false);
  });

  it("allows nothing when the allow-list is empty", () => {
    expect(isAllowedOrigin("https://acme.com", [])).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("echoes the caller's own origin, never a list and never a wildcard", () => {
    const headers = corsHeaders("https://app.acme.com", ALLOWED);

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.acme.com");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("sends Vary on a rejection too, so a shared cache cannot leak the header", () => {
    const headers = corsHeaders("https://evil.com", ALLOWED);

    expect(headers).toEqual({ Vary: "Origin" });
  });
});

describe("corsPreflightHeaders", () => {
  it("adds the preflight trio for an allowed origin", () => {
    const headers = corsPreflightHeaders("https://acme.com", ALLOWED);

    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });

  it("tells a rejected origin nothing about what would be allowed", () => {
    expect(corsPreflightHeaders("https://evil.com", ALLOWED)).toEqual({ Vary: "Origin" });
  });
});
