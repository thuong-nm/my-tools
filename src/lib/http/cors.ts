// Pure policy: `proxy.ts` supplies the request's Origin and the allow-list from config. An
// allowed request gets its OWN origin echoed back — `Access-Control-Allow-Origin` carries
// exactly one value, and `*` is rejected outright by browsers once credentials are allowed.

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";
const PREFLIGHT_MAX_AGE_SECONDS = 86_400;

export function isAllowedOrigin(
  origin: string | null,
  allowedOrigins: readonly string[],
): origin is string {
  return origin !== null && origin !== "null" && allowedOrigins.includes(origin);
}

// `Vary` goes on every response, including a rejection: without it a shared cache can hand one
// site's Allow-Origin header to another site.
export function corsHeaders(
  origin: string | null,
  allowedOrigins: readonly string[],
): Record<string, string> {
  if (!isAllowedOrigin(origin, allowedOrigins)) return { Vary: "Origin" };

  return {
    Vary: "Origin",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  };
}

export function corsPreflightHeaders(
  origin: string | null,
  allowedOrigins: readonly string[],
): Record<string, string> {
  const headers = corsHeaders(origin, allowedOrigins);
  if (!("Access-Control-Allow-Origin" in headers)) return headers;

  return {
    ...headers,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": String(PREFLIGHT_MAX_AGE_SECONDS),
  };
}
