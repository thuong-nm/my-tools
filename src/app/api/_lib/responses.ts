import type { z } from "zod";

import type { DomainError } from "@/lib/domain/errors/domain-error";
import {
  WIRE_CODE_STATUS,
  isWireCode,
  type ApiErrorBody,
  type ApiSuccessBody,
  type WireCode,
} from "@/lib/http/envelope";

// Domain codes are finer-grained than what we publish, so each collapses onto one wire code; the
// specific reason survives in `message`. Add a row per domain code — extending WIRE_CODES is a
// contract change.
const WIRE_CODE: Readonly<Record<string, WireCode>> = {
  VALIDATION_FAILED: "VALIDATION_ERROR",
  INVALID_CREDENTIALS: "UNAUTHENTICATED",
  EMAIL_ALREADY_REGISTERED: "CONFLICT",
  REPOSITORY_CONFLICT: "CONFLICT",
  // 410 Gone is not one of the published eight, and an expired link is indistinguishable
  // from a missing one to a client: both mean "there is nothing here".
  TEXT_SHARE_EXPIRED: "NOT_FOUND",
};

export function wireCode(code: string): WireCode {
  const mapped = WIRE_CODE[code];
  if (mapped) return mapped;
  if (isWireCode(code)) return code;

  // So a domain code added later lands somewhere sane instead of defaulting to 500.
  if (code.endsWith("_NOT_FOUND")) return "NOT_FOUND";
  if (code.endsWith("_UNAVAILABLE") || code.endsWith("_REJECTED")) {
    return "UPSTREAM_UNAVAILABLE";
  }

  // An unrecognised failure is ours until proven otherwise — never a 2xx, never a 4xx.
  return "INTERNAL_ERROR";
}

export function statusForCode(code: string): number {
  return WIRE_CODE_STATUS[wireCode(code)];
}

// An ALLOW-list, not a filter: a repository may attach internal context for logs without knowing
// this file exists. Add the keys your own errors carry.
const PUBLIC_DETAIL_KEYS: ReadonlySet<string> = new Set(["fieldErrors"]);

function publicDetails(
  details: Readonly<Record<string, unknown>> | undefined,
  status: number,
): Readonly<Record<string, unknown>> | undefined {
  // On a 5xx the message is already withheld; details from the same error would put it back.
  if (details === undefined || status >= 500) return undefined;

  const allowed = Object.entries(details).filter(([key]) =>
    PUBLIC_DETAIL_KEYS.has(key),
  );

  return allowed.length > 0 ? Object.fromEntries(allowed) : undefined;
}

/** Only allow-listed `details` keys reach the client. */
export function errorResponse(error: DomainError): Response {
  const status = statusForCode(error.code);

  if (status >= 500) {
    // Withheld from the client below, so it is recorded here or the reason is lost entirely.
    console.error(`[api] ${status} ${error.code}: ${error.message}`, error.details ?? "");
  }

  const details = publicDetails(error.details, status);

  const body: ApiErrorBody = {
    error: {
      code: wireCode(error.code),
      message: status >= 500 ? "Something went wrong on our side." : error.message,
      ...(details ? { details } : {}),
    },
  };

  return Response.json(body, { status });
}

export function badRequest(error: z.ZodError): Response {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    (fieldErrors[path] ??= []).push(issue.message);
  }

  const body: ApiErrorBody = {
    error: {
      code: "VALIDATION_ERROR",
      message: "The request could not be understood.",
      details: { fieldErrors },
    },
  };

  return Response.json(body, { status: 400 });
}

/** A JSON body, never a redirect: the caller is not a browser. */
export function unauthenticated(): Response {
  return errorResponse({ code: "UNAUTHENTICATED", message: "Sign in required." });
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data } satisfies ApiSuccessBody<T>, { status });
}

export function created<T>(data: T): Response {
  return Response.json({ data } satisfies ApiSuccessBody<T>, { status: 201 });
}
