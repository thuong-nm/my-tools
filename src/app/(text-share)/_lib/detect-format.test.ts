import { describe, expect, it } from "vitest";

import { detectFormat } from "./detect-format";

describe("detectFormat", () => {
  it.each([
    ["", "PLAIN"],
    ["just some prose", "PLAIN"],
    ['{"a":1}', "JSON"],
    ["[1, 2, 3]", "JSON"],
    ["{not really json}", "PLAIN"],
    ["<!DOCTYPE html><html><body>hi</body></html>", "HTML"],
    ["<html lang=\"en\"></html>", "HTML"],
    ['<?xml version="1.0"?><a><b/></a>', "XML"],
    ["<note><to>you</to></note>", "XML"],
    ["# Heading", "MARKDOWN"],
    ["- one\n- two", "MARKDOWN"],
    ["some **bold** text", "MARKDOWN"],
    ["```js\nconst a = 1;\n```", "MARKDOWN"],
    ["see [the docs](https://example.com)", "MARKDOWN"],
  ] as const)("detects %j as %s", (text, expected) => {
    expect(detectFormat(text)).toBe(expected);
  });

  it("prefers JSON over Markdown for a JSON body containing markdown-ish strings", () => {
    expect(detectFormat('{"note":"- one\\n- two"}')).toBe("JSON");
  });
});
