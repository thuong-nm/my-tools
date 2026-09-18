import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";

// The editor's "Auto Detect" is deliberately absent: detection is a browser affordance that
// resolves to one of these before anything is stored, so "AUTO" can never reach the database.
export const CONTENT_FORMATS = [
  "PLAIN",
  "MARKDOWN",
  "JSON",
  "XML",
  "HTML",
  "HTML_RENDER",
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export function isContentFormat(value: unknown): value is ContentFormat {
  return typeof value === "string" && (CONTENT_FORMATS as readonly string[]).includes(value);
}

export function contentFormat(value: string): Result<ContentFormat, ValidationError> {
  if (!isContentFormat(value)) {
    return err(
      validationError(`Unknown content format: ${value}.`, {
        format: [`Must be one of ${CONTENT_FORMATS.join(", ")}.`],
      }),
    );
  }
  return ok(value);
}
