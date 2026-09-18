import { describe, expect, it } from "vitest";

import { toBase64Url } from "./base64";
import { decodeJwt, isExpired, timeClaims } from "./decode-jwt";

function makeToken(header: unknown, payload: unknown, signature = "c2ln"): string {
  const encode = (value: unknown) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));

  return `${encode(header)}.${encode(payload)}.${signature}`;
}

const HEADER = { alg: "HS256", typ: "JWT" };

describe("decodeJwt", () => {
  it("splits a token into header, payload and the untouched signature", () => {
    const token = makeToken(HEADER, { sub: "42", name: "Xin chào" });

    const result = decodeJwt(token);

    expect(result).toEqual({
      ok: true,
      value: {
        header: HEADER,
        payload: { sub: "42", name: "Xin chào" },
        signature: "c2ln",
      },
    });
  });

  it("tolerates a Bearer prefix and surrounding whitespace", () => {
    const token = makeToken(HEADER, { sub: "42" });

    expect(decodeJwt(`  Bearer ${token}  `)).toEqual(decodeJwt(token));
  });

  it("names the wrong part count rather than saying 'invalid token'", () => {
    expect(decodeJwt("a.b")).toEqual({
      ok: false,
      error: "A JWT has three dot-separated parts; this has 2.",
    });
  });

  it("distinguishes a bad base64url segment from a bad JSON one", () => {
    const payload = toBase64Url(new TextEncoder().encode("{}"));

    expect(decodeJwt(`!!!.${payload}.sig`)).toEqual({
      ok: false,
      error: "The header is not valid base64url.",
    });

    const notJson = toBase64Url(new TextEncoder().encode("nope"));
    expect(decodeJwt(`${payload}.${notJson}.sig`)).toEqual({
      ok: false,
      error: "The payload is not valid JSON.",
    });
  });

  it("rejects a segment that decodes to JSON but not to an object", () => {
    const array = toBase64Url(new TextEncoder().encode("[1,2]"));
    const object = toBase64Url(new TextEncoder().encode("{}"));

    expect(decodeJwt(`${object}.${array}.sig`)).toEqual({
      ok: false,
      error: "The payload is not a JSON object.",
    });
  });

  it("reports an empty input", () => {
    expect(decodeJwt("  ")).toEqual({ ok: false, error: "There is nothing to decode." });
  });
});

describe("timeClaims", () => {
  it("reads NumericDate claims as seconds, not milliseconds", () => {
    expect(timeClaims({ iat: 1_700_000_000, exp: 1_700_003_600 })).toEqual([
      { kind: "issuedAt", claim: "iat", seconds: 1_700_000_000, iso: "2023-11-14T22:13:20.000Z" },
      { kind: "expiresAt", claim: "exp", seconds: 1_700_003_600, iso: "2023-11-14T23:13:20.000Z" },
    ]);
  });

  it("skips a claim that is present but not a finite number", () => {
    expect(timeClaims({ exp: "soon", nbf: Number.NaN, iat: 1 })).toHaveLength(1);
  });
});

describe("isExpired", () => {
  const exp = 1_700_003_600;

  it("is true once the instant has passed, and at exactly the expiry second", () => {
    expect(isExpired({ exp }, new Date(exp * 1000))).toBe(true);
    expect(isExpired({ exp }, new Date((exp + 1) * 1000))).toBe(true);
  });

  it("is false before the expiry, and when there is no exp at all", () => {
    expect(isExpired({ exp }, new Date((exp - 1) * 1000))).toBe(false);
    expect(isExpired({ sub: "42" }, new Date())).toBe(false);
  });
});
