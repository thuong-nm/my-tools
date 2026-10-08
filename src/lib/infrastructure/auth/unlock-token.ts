import { createHmac, timingSafeEqual } from "node:crypto";

// Same shape as the session token, and deliberately so: the signature IS the proof, so holding
// a share open for a day costs no row and no lookup. The domain separator keeps a session token
// from ever validating as an unlock, and the code keeps one share's grant off another's.
const ALGORITHM = "sha256";

export const UNLOCK_LIFETIME_HOURS = 24;

function sign(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(`unlock ${payload}`).digest("base64url");
}

function payloadFor(code: string, expiresAtSeconds: number): string {
  return `${code}.${expiresAtSeconds}`;
}

export function signUnlockToken(input: {
  code: string;
  expiresAt: Date;
  secret: string;
}): string {
  const exp = Math.floor(input.expiresAt.getTime() / 1000);
  const payload = payloadFor(input.code, exp);

  return `${exp}.${sign(payload, input.secret)}`;
}

/** True only for a token this secret signed, for this code, that has not expired. */
export function verifyUnlockToken(input: {
  token: string;
  code: string;
  secret: string;
  now: Date;
}): boolean {
  const separator = input.token.indexOf(".");
  if (separator <= 0) return false;

  const exp = Number(input.token.slice(0, separator));
  const signature = input.token.slice(separator + 1);
  if (!Number.isFinite(exp)) return false;

  const expected = Buffer.from(sign(payloadFor(input.code, exp), input.secret));
  const actual = Buffer.from(signature);

  // Constant time: `===` leaks how much of a forgery was right, a byte at a time.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  return exp * 1000 > input.now.getTime();
}
