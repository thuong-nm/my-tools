import type { ContentFormat } from "@/lib/domain/value-objects/content-format";

export type MarkupAttribute = { readonly name: string; readonly value: string };

export type MarkupNode =
  | {
      readonly kind: "element";
      readonly tag: string;
      readonly attributes: readonly MarkupAttribute[];
      readonly children: readonly MarkupNode[];
    }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "comment"; readonly text: string };

function convert(node: Node): MarkupNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? "";
    return text ? { kind: "text", text } : null;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return { kind: "comment", text: node.textContent ?? "" };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;

  return {
    kind: "element",
    tag: element.tagName.toLowerCase(),
    attributes: Array.from(element.attributes, (attribute) => ({
      name: attribute.name,
      value: attribute.value,
    })),
    children: Array.from(element.childNodes, convert).filter(
      (child): child is MarkupNode => child !== null,
    ),
  };
}

// Falls back from an XML parse to an HTML one: most pasted markup is a fragment with unquoted
// attributes or void tags that no XML parser accepts.
export function parseMarkup(source: string, format: ContentFormat): readonly MarkupNode[] {
  const parser = new DOMParser();
  const lowered = source.trim().toLowerCase();
  const isDocument = lowered.startsWith("<!doctype") || lowered.startsWith("<html");

  if (format === "XML" && !isDocument) {
    const xml = parser.parseFromString(source, "text/xml");
    if (!xml.querySelector("parsererror") && xml.documentElement) {
      const root = convert(xml.documentElement);
      if (root) return [root];
    }
  }

  const html = parser.parseFromString(source, "text/html");

  if (!isDocument && html.body) {
    return Array.from(html.body.childNodes, convert).filter(
      (child): child is MarkupNode => child !== null,
    );
  }

  const root = html.documentElement ? convert(html.documentElement) : null;
  return root ? [root] : [];
}
