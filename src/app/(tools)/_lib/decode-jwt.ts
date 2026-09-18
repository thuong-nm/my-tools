import type { JsonObject } from "@/lib/domain/shared/json";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import { fromBase64Url } from "./base64";

export type DecodedJwt = {
  readonly header: JsonObject;
  readonly payload: JsonObject;
  /** Kept raw and never checked — see `decodeJwt`. */
  readonly signature: string;
};

export type ClaimKind = "issuedAt" | "notBefore" | "expiresAt";

export type TimeClaim = {
  readonly kind: ClaimKind;
  readonly claim: string;
  readonly seconds: number;
  readonly iso: string;
};

const TIME_CLAIMS: readonly (readonly [string, ClaimKind])[] = [
  ["iat", "issuedAt"],
  ["nbf", "notBefore"],
  ["exp", "expiresAt"],
];

function decodeSegment(segment: string, label: string): Result<JsonObject, string> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(fromBase64Url(segment));
  } catch {
    return err(`The ${label} is not valid base64url.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return err(`The ${label} is not valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err(`The ${label} is not a JSON object.`);
  }

  return ok(parsed as JsonObject);
}

// Decodes only. Verifying the signature needs the issuer's key, which this tool never has, so a
// decoded token says what it claims — never that the claim is true.
export function decodeJwt(token: string): Result<DecodedJwt, string> {
  const trimmed = token.trim().replace(/\s+/g, "");
  if (!trimmed) return err("There is nothing to decode.");

  const parts = trimmed.replace(/^Bearer\s*/i, "").split(".");
  if (parts.length !== 3) {
    return err(`A JWT has three dot-separated parts; this has ${parts.length}.`);
  }

  const [rawHeader = "", rawPayload = "", signature = ""] = parts;

  const header = decodeSegment(rawHeader, "header");
  if (!header.ok) return header;

  const payload = decodeSegment(rawPayload, "payload");
  if (!payload.ok) return payload;

  return ok({ header: header.value, payload: payload.value, signature });
}

/** NumericDate claims (RFC 7519 §2) are seconds, not milliseconds — a common off-by-1000 bug. */
export function timeClaims(payload: JsonObject): readonly TimeClaim[] {
  const claims: TimeClaim[] = [];

  for (const [claim, kind] of TIME_CLAIMS) {
    const value = payload[claim];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;

    claims.push({ kind, claim, seconds: value, iso: new Date(value * 1000).toISOString() });
  }

  return claims;
}

export function isExpired(payload: JsonObject, now: Date): boolean {
  const exp = payload["exp"];

  return typeof exp === "number" && Number.isFinite(exp) && exp * 1000 <= now.getTime();
}
