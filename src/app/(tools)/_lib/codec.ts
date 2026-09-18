import { fromBase64Url, toBase64Url } from "./base64";

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
