import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless: the signature IS the proof, so a sign-in costs no database row and no lookup on
// every request. The trade is that signing out cannot revoke an already-issued token before it
// expires, which is why the lifetime below is short enough to matter.
const ALGORITHM = "sha256";

export const SESSION_LIFETIME_DAYS = 30;

type SessionClaims = {
  readonly sub: string;
  /** Seconds since the epoch, as a token expiry is conventionally written. */
  readonly exp: number;
};

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest("base64url");
}

export function signSessionToken(input: {
  userId: string;
  expiresAt: Date;
  secret: string;
}): string {
  const claims: SessionClaims = {
    sub: input.userId,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
  };

  const payload = base64url(JSON.stringify(claims));

  return `${payload}.${sign(payload, input.secret)}`;
}

/** The signed-in user's id, or undefined for a token that is malformed, forged or expired. */
export function verifySessionToken(input: {
  token: string;
  secret: string;
  now: Date;
}): string | undefined {
  const parts = input.token.split(".");
  if (parts.length !== 2) return undefined;

  const [payload, signature] = parts;
  if (!matchesSignature(payload, signature, input.secret)) return undefined;

  const claims = readClaims(payload);
  if (!claims) return undefined;

  return claims.exp * 1000 > input.now.getTime() ? claims.sub : undefined;
}

// Compared byte-wise in constant time: `===` on a signature leaks how much of a forgery was
// right, which is enough to build one a byte at a time.
function matchesSignature(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function readClaims(payload: string): SessionClaims | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null) return undefined;

  const { sub, exp } = parsed as Partial<SessionClaims>;

  return typeof sub === "string" && sub.length > 0 && typeof exp === "number"
    ? { sub, exp }
    : undefined;
}
