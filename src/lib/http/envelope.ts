// The wire contract, shared by the route handlers that produce it and the browser client that
// reads it. Pure TypeScript on purpose: the day the app moves behind a separate frontend, this
// file is the only thing both sides need.
//
// There is no `success` field. The HTTP status already says which shape arrived, and a second
// source of truth is a second thing to get wrong.

/** The COMPLETE published set. A client can branch on it as a closed list. */
export const WIRE_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE_TRANSITION",
  "INTERNAL_ERROR",
  "UPSTREAM_UNAVAILABLE",
] as const;

export type WireCode = (typeof WIRE_CODES)[number];

// Adding a code here is a deliberate contract change. A new DOMAIN code does not need one —
// map it onto an existing wire code in app/api/_lib/responses.ts instead.
export const WIRE_CODE_STATUS: Readonly<Record<WireCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  INTERNAL_ERROR: 500,
  UPSTREAM_UNAVAILABLE: 502,
};

export type ApiSuccessBody<T> = { readonly data: T };

export type ApiErrorBody = {
  readonly error: {
    readonly code: WireCode;
    readonly message: string;
    /** Machine-readable only — never prose. Omitted entirely when there is nothing to say. */
    readonly details?: Readonly<Record<string, unknown>>;
  };
};

/** Zod field errors, keyed by dotted path, as `badRequest()` sends them. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export function isWireCode(value: unknown): value is WireCode {
  return typeof value === "string" && value in WIRE_CODE_STATUS;
}

export function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null) return false;
  const error = (body as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export function fieldErrorsOf(
  details: Readonly<Record<string, unknown>> | undefined,
): FieldErrors | undefined {
  const raw = details?.fieldErrors;
  return typeof raw === "object" && raw !== null ? (raw as FieldErrors) : undefined;
}
