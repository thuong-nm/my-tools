import { randomBytes } from "node:crypto";

import { SHARE_CODE_ALPHABET, SHARE_CODE_LENGTH } from "@/lib/domain/value-objects/share-code";

// Rejection sampling rather than `byte % alphabet.length`: 256 is not a multiple of 29, so the
// modulo would make the first few glyphs measurably likelier and shrink the real keyspace.
const CEILING = Math.floor(256 / SHARE_CODE_ALPHABET.length) * SHARE_CODE_ALPHABET.length;

export function generateShareCode(): string {
  let code = "";

  while (code.length < SHARE_CODE_LENGTH) {
    for (const byte of randomBytes(SHARE_CODE_LENGTH)) {
      if (byte >= CEILING) continue;
      code += SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length];
      if (code.length === SHARE_CODE_LENGTH) break;
    }
  }

  return code;
}
