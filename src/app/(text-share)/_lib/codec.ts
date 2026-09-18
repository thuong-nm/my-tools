// The share-by-URL mode has to work with no server at all, so the payload is compressed here
// and the database stores the result opaquely. `CompressionStream` keeps this dependency-free.
const RAW = "R";
const DEFLATE = "Z";

async function deflate(text: string): Promise<Uint8Array> {
  const compressed = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const decompressed = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Response(decompressed).text();
}

function toBase64Url(bytes: Uint8Array): string {
  // Built up a byte at a time: `String.fromCharCode(...bytes)` throws RangeError once the
  // payload passes the argument limit, which is well inside the sizes this tool accepts.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

/** Picks whichever encoding is shorter — deflate loses to plain text on very short input. */
export async function compress(text: string): Promise<string> {
  if (!text) return "";

  const raw = RAW + encodeURIComponent(text);
  const deflated = DEFLATE + toBase64Url(await deflate(text));

  return deflated.length < raw.length ? deflated : raw;
}

/** `null` means "unreadable link", never a throw: a bad hash must not break the editor. */
export async function decompress(payload: string): Promise<string | null> {
  if (!payload) return "";

  const body = payload.slice(1);

  try {
    switch (payload[0]) {
      case RAW:
        return decodeURIComponent(body);
      case DEFLATE:
        return await inflate(fromBase64Url(body));
      default:
        return null;
    }
  } catch {
    return null;
  }
}
