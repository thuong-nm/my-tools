import { err, ok, type Result } from "@/lib/domain/shared/result";

export function bytesToBase64(bytes: Uint8Array): string {
  // Built up a byte at a time: `String.fromCharCode(...bytes)` throws RangeError once the
  // payload passes the argument limit, which is well inside the sizes these tools accept.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");

  return base64ToBytes(padded);
}

export function encodeBase64(text: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(text);

  return urlSafe ? toBase64Url(bytes) : bytesToBase64(bytes);
}

// Accepts either alphabet and tolerates missing padding, because the two are indistinguishable
// on input that happens to contain neither +/ nor -_ — rejecting one of them would be a guess.
export function decodeBase64(value: string): Result<string, string> {
  const trimmed = value.trim().replace(/\s+/g, "");
  if (!trimmed) return err("There is nothing to decode.");

  try {
    const bytes = fromBase64Url(trimmed);

    // `fatal` so invalid UTF-8 is reported rather than silently replaced with U+FFFD, which
    // would render as "�" and look like the tool corrupted the input.
    return ok(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return err("That is not valid Base64, or it does not decode to UTF-8 text.");
  }
}
