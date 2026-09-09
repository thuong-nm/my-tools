import type { NextRequest } from "next/server";

/** `null` rather than a throw for a malformed body, so the caller answers 400 not 500. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// `x-forwarded-for` is client-controlled unless a trusted proxy overwrites it, so never use this
// for anything security-bearing — only as a signal passed to an upstream service.
export function clientIpAddress(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? undefined;
}
