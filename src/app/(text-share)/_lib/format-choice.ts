import { CONTENT_FORMATS, type ContentFormat } from "@/lib/domain/value-objects/content-format";
import { detectFormat } from "./detect-format";

/** "AUTO" never leaves the browser: it resolves to a real format before anything is stored. */
export const FORMAT_CHOICES = ["AUTO", ...CONTENT_FORMATS] as const;

export type FormatChoice = (typeof FORMAT_CHOICES)[number];

export const FORMAT_LABELS: Readonly<Record<FormatChoice, string>> = {
  AUTO: "Auto detect",
  PLAIN: "Plain text",
  MARKDOWN: "Markdown",
  JSON: "JSON",
  XML: "XML",
  HTML: "HTML",
  HTML_RENDER: "HTML (render)",
};

export function resolveFormat(choice: FormatChoice, text: string): ContentFormat {
  return choice === "AUTO" ? detectFormat(text) : choice;
}
