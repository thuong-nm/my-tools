import { validationError, type ValidationError } from "../errors/domain-error";
import { err, ok, type Result } from "../shared/result";

export const RETENTIONS = ["ONE_DAY", "ONE_WEEK", "ONE_MONTH", "ONE_YEAR"] as const;

export type Retention = (typeof RETENTIONS)[number];

// A retention window is a fixed duration, not a calendar operation: "a month" here means 30
// days, so no time zone or DST reasoning enters, and two shares saved a second apart cannot
// expire a day apart.
const RETENTION_DAYS: Readonly<Record<Retention, number>> = {
  ONE_DAY: 1,
  ONE_WEEK: 7,
  ONE_MONTH: 30,
  ONE_YEAR: 365,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isRetention(value: unknown): value is Retention {
  return typeof value === "string" && (RETENTIONS as readonly string[]).includes(value);
}

export function retention(value: string): Result<Retention, ValidationError> {
  if (!isRetention(value)) {
    return err(
      validationError(`Unknown retention window: ${value}.`, {
        retention: [`Must be one of ${RETENTIONS.join(", ")}.`],
      }),
    );
  }
  return ok(value);
}

export function expiryFrom(now: Date, window: Retention): Date {
  return new Date(now.getTime() + RETENTION_DAYS[window] * MS_PER_DAY);
}
