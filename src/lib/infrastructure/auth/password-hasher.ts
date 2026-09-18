import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt from the standard library rather than bcrypt or argon2: it is a real password KDF and
// it costs no native dependency, which keeps `npm ci` working on any platform.
const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCHEME = "scrypt";
const SALT_BYTES = 16;
const KEY_BYTES = 64;

// Floors, not the exact sizes above, so a hash written at other parameters still verifies. They
// exist because base64 decoding is lenient: a truncated row would otherwise decode to an empty
// key, derive an empty candidate, and compare equal to ANY password.
const MIN_SALT_BYTES = 8;
const MIN_KEY_BYTES = 16;

const COST = { N: 32_768, r: 8, p: 1 } as const;

// scrypt needs roughly 128 * N * r bytes; Node's 32 MB default would reject the cost above.
const MAX_MEMORY = 128 * COST.N * COST.r * 2;

type Cost = { readonly N: number; readonly r: number; readonly p: number };

// Self-describing: the parameters travel with the hash, so raising the cost later leaves every
// existing password still verifiable against the cost it was stored with.
function encode(cost: Cost, salt: Buffer, key: Buffer): string {
  return [SCHEME, cost.N, cost.r, cost.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

function decode(stored: string): { cost: Cost; salt: Buffer; key: Buffer } | undefined {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) return undefined;

  const [, n, r, p, salt, key] = parts;
  const cost = { N: Number(n), r: Number(r), p: Number(p) };

  if (!Number.isInteger(cost.N) || !Number.isInteger(cost.r) || !Number.isInteger(cost.p)) {
    return undefined;
  }

  const decoded = { cost, salt: Buffer.from(salt, "base64"), key: Buffer.from(key, "base64") };

  if (decoded.salt.length < MIN_SALT_BYTES || decoded.key.length < MIN_KEY_BYTES) {
    return undefined;
  }

  return decoded;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, KEY_BYTES, { ...COST, maxmem: MAX_MEMORY });

  return encode(COST, salt, key);
}

// Answers false rather than throwing on a hash this build cannot read: an unreadable row is a
// failed sign-in, not a 500 that tells the caller their account is broken.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = decode(stored);
  if (!parsed) return false;

  let candidate: Buffer;
  try {
    candidate = await derive(password, parsed.salt, parsed.key.length, {
      ...parsed.cost,
      maxmem: 128 * parsed.cost.N * parsed.cost.r * 2,
    });
  } catch {
    return false;
  }

  return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
}
