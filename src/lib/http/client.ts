import {
  fieldErrorsOf,
  isApiErrorBody,
  isWireCode,
  type FieldErrors,
  type WireCode,
} from "./envelope";

// Every failure a client component can see, in one type — otherwise each one re-derives it from
// `response.status` and `body?.error?.message`, and the same 409 gets handled three ways.
export class ApiError extends Error {
  readonly code: WireCode;
  /** 0 when the request never reached the server, so "offline" is distinguishable from a 500. */
  readonly status: number;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly fieldErrors?: FieldErrors;

  constructor(init: {
    code: WireCode;
    status: number;
    message: string;
    details?: Readonly<Record<string, unknown>>;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.fieldErrors = fieldErrorsOf(init.details);
  }

  get isOffline(): boolean {
    return this.status === 0;
  }
}

type ApiFetchOptions = RequestInit & {
  /** Shown when the server sends no usable message, or when the request never arrived. */
  fallbackMessage?: string;
};

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

// An `AbortError` is rethrown untouched: a cancelled request is not a failure to report.
export async function apiFetch<T>(
  url: string,
  { fallbackMessage = DEFAULT_MESSAGE, ...init }: ApiFetchOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError({
      code: "INTERNAL_ERROR",
      status: 0,
      message: fallbackMessage,
    });
  }

  // A proxy or a crash can answer with HTML, so an unparseable body must not throw into render.
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = isApiErrorBody(body) ? body.error : undefined;
    throw new ApiError({
      code: isWireCode(error?.code) ? error.code : "INTERNAL_ERROR",
      status: response.status,
      message: error?.message ?? fallbackMessage,
      details: error?.details,
    });
  }

  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError({
      code: "INTERNAL_ERROR",
      status: response.status,
      message: fallbackMessage,
    });
  }

  return (body as { data: T }).data;
}

/** POST with a JSON body — the shape of every mutation. */
export function apiPost<T>(
  url: string,
  body?: unknown,
  options: ApiFetchOptions = {},
): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    ...options,
  });
}
