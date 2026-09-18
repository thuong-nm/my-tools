// All-numeric on purpose: `month: "short"` renders "Sep" or "Sept" depending on the ICU version
// bundled with Node, which makes the same code produce different output per runtime.
const PARTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

// Server-rendered only. Without `timeZone` it formats in the process zone (TZ in .env), which
// the browser would not reproduce — calling this during hydration would warn about a mismatch.
export function formatTimestamp(iso: string, timeZone?: string): string {
  const options = timeZone === undefined ? PARTS : { ...PARTS, timeZone };

  return new Intl.DateTimeFormat("en-GB", options).format(new Date(iso));
}
