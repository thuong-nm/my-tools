const HOME = "/";

// An absolute URL or a protocol-relative `//host` in a redirect parameter would turn our own
// sign-in form into an open redirect, so only a same-origin path is honoured. Backslashes count
// because browsers normalise `/\evil.com` to `//evil.com`.
export function safeNextPath(raw: string | readonly string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string") return HOME;
  if (!value.startsWith("/") || value.startsWith("//")) return HOME;
  if (value.includes("\\")) return HOME;

  return value;
}
