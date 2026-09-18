import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { ContentFormat } from "@/lib/domain/value-objects/content-format";

function opensBlock(line: string): boolean {
  return (
    line.startsWith("<") &&
    !line.startsWith("</") &&
    !line.startsWith("<?") &&
    !line.startsWith("<!") &&
    !line.endsWith("/>") &&
    !/<\/[^>]+>$/.test(line)
  );
}

function indentMarkup(text: string): string {
  const indented: string[] = [];
  let depth = 0;

  for (const raw of text.replace(/>\s*</g, ">\n<").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("</")) depth = Math.max(0, depth - 1);
    indented.push("  ".repeat(depth) + line);
    if (opensBlock(line)) depth += 1;
  }

  return indented.join("\n");
}

const FORMATTABLE: ReadonlySet<ContentFormat> = new Set(["JSON", "XML", "HTML", "HTML_RENDER"]);

/** So callers can skip formats that have no formatter instead of re-listing them and drifting. */
export function canFormat(format: ContentFormat): boolean {
  return FORMATTABLE.has(format);
}

/** The error is a message for the toast — this is an editor affordance, not a business rule. */
export function formatSource(text: string, format: ContentFormat): Result<string, string> {
  const trimmed = text.trim();
  if (!trimmed) return err("There is nothing to format.");

  if (format === "JSON") {
    try {
      return ok(JSON.stringify(JSON.parse(trimmed), null, 2));
    } catch (cause) {
      return err(`Invalid JSON: ${cause instanceof Error ? cause.message : "unparseable"}`);
    }
  }

  if (format === "XML" || format === "HTML" || format === "HTML_RENDER") {
    return ok(indentMarkup(trimmed));
  }

  return err("Formatting is available for JSON, XML and HTML.");
}
