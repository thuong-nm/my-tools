// `code` is part of the published contract: route handlers map it to an HTTP status and the
// client to a translated message. Renaming one is breaking; adding one is not.

/** Plain data, not an `Error` subclass — these get serialized, not thrown. */
export type DomainError<TCode extends string = string> = {
  readonly code: TCode;
  /** English, developer-facing. User-facing copy is chosen by the client from `code`. */
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

export function domainError<TCode extends string>(
  code: TCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): DomainError<TCode> {
  return details === undefined ? { code, message } : { code, message, details };
}

/** `fieldErrors` is keyed by field path so a form can render errors inline. */
export type ValidationError = DomainError<"VALIDATION_FAILED"> & {
  readonly details?: {
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
};

export function validationError(
  message: string,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): ValidationError {
  return fieldErrors === undefined
    ? { code: "VALIDATION_FAILED", message }
    : { code: "VALIDATION_FAILED", message, details: { fieldErrors } };
}
