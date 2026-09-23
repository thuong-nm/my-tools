import { createHash, randomBytes } from "node:crypto";

// 32 bytes of CSPRNG output. High-entropy and unguessable, so SHA-256 is the right hash here —
// a KDF exists to slow down guessing a LOW-entropy secret, which a password is and this is not.
const TOKEN_BYTES = 32;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { readonly token: string; readonly tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  return { token, tokenHash: hashResetToken(token) };
}
