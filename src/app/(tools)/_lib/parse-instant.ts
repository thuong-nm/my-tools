import { err, ok, type Result } from "@/lib/domain/shared/result";

export type InstantSource = "seconds" | "milliseconds" | "iso";

export type ParsedInstant = {
  readonly date: Date;
  readonly source: InstantSource;
};

// 10 digits is seconds until the year 2286 and 13 is milliseconds from 2001, so the digit count
// separates them for every timestamp anyone pastes in practice. Ambiguity is reported, not guessed.
const SECONDS = /^-?\d{1,11}$/;
const MILLISECONDS = /^-?\d{12,14}$/;

export function parseInstant(input: string): Result<ParsedInstant, string> {
  const trimmed = input.trim();
  if (!trimmed) return err("There is nothing to convert.");

  if (SECONDS.test(trimmed) || MILLISECONDS.test(trimmed)) {
    const numeric = Number(trimmed);
    const source: InstantSource = MILLISECONDS.test(trimmed) ? "milliseconds" : "seconds";
    const date = new Date(source === "seconds" ? numeric * 1000 : numeric);

    // Unreachable for the digit counts above, but the regexes are the only thing keeping it so.
    return Number.isNaN(date.getTime())
      ? err("That number is outside the range of a date.")
      : ok({ date, source });
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return err("Enter a Unix timestamp in seconds or milliseconds, or an ISO 8601 date.");
  }

  return ok({ date, source: "iso" });
}

// Floored, not truncated: a Unix second spans [n, n+1), so the second containing -500ms is -1.
// Math.trunc would map both -500ms and +500ms to 0 and collapse two different seconds into one.
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function toRelative(date: Date, now: Date): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
    ["year", 31_536_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
  }

  return format.format(0, "second");
}
