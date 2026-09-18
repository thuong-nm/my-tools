import type { ContentFormat } from "@/lib/domain/value-objects/content-format";

const MARKDOWN_SIGNALS = [
  /^#{1,6}\s/m,
  /^[-*+]\s/m,
  /^>\s/m,
  /\*\*[^*]+\*\*/,
  /```/,
  /\[[^\]]*\]\([^)]*\)/,
];

function looksLikeJson(trimmed: string): boolean {
  const wrapped =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!wrapped) return false;

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/** A guess for the editor's "Auto Detect", not a decision any rule depends on. */
export function detectFormat(text: string): ContentFormat {
  const trimmed = text.trim();
  if (!trimmed) return "PLAIN";

  if (looksLikeJson(trimmed)) return "JSON";

  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("<!doctype html") || lowered.startsWith("<html")) return "HTML";
  if (trimmed.startsWith("<?xml")) return "XML";
  // Any other markup goes to the XML tree, which falls back to an HTML parse on its own.
  if (trimmed.startsWith("<") && trimmed.includes("</")) return "XML";

  if (MARKDOWN_SIGNALS.some((signal) => signal.test(trimmed))) return "MARKDOWN";

  return "PLAIN";
}
