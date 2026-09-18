// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { parseMarkup, type MarkupNode } from "./parse-markup";

function element(node: MarkupNode | undefined) {
  if (node?.kind !== "element") throw new Error(`Expected an element, got ${node?.kind}`);
  return node;
}

describe("parseMarkup", () => {
  it("parses a well-formed XML document from its root", () => {
    const [root] = parseMarkup("<note><to>you</to></note>", "XML");
    const note = element(root);

    expect(note.tag).toBe("note");
    expect(element(note.children[0]).tag).toBe("to");
    expect(note.children[0]).toMatchObject({
      children: [{ kind: "text", text: "you" }],
    });
  });

  it("keeps attributes in source order", () => {
    const [root] = parseMarkup('<a href="/x" title="t">go</a>', "XML");

    expect(element(root).attributes).toEqual([
      { name: "href", value: "/x" },
      { name: "title", value: "t" },
    ]);
  });

  // The fallback that matters: this is not well-formed XML, but it is everyday HTML.
  it("falls back to an HTML parse for a fragment XML rejects", () => {
    const nodes = parseMarkup("<div class=unquoted><br><p>hi</div>", "XML");
    const div = element(nodes[0]);

    expect(div.tag).toBe("div");
    expect(div.attributes).toEqual([{ name: "class", value: "unquoted" }]);
    expect(div.children.map((child) => child.kind)).toEqual(["element", "element"]);
  });

  it("returns fragment siblings rather than wrapping them in <html>", () => {
    const nodes = parseMarkup("<p>one</p><p>two</p>", "HTML");
    expect(nodes.map((node) => element(node).tag)).toEqual(["p", "p"]);
  });

  it("starts a full document at <html>", () => {
    const [root] = parseMarkup("<!doctype html><html><body><p>hi</p></body></html>", "HTML");
    expect(element(root).tag).toBe("html");
  });

  it("drops whitespace-only text but keeps real text and comments", () => {
    const [root] = parseMarkup("<a>\n  <!-- why -->\n  <b>x</b>\n</a>", "XML");

    expect(element(root).children).toEqual([
      { kind: "comment", text: " why " },
      { kind: "element", tag: "b", attributes: [], children: [{ kind: "text", text: "x" }] },
    ]);
  });

  it("returns nothing for input with no markup at all", () => {
    expect(parseMarkup("", "XML")).toEqual([]);
  });
});
