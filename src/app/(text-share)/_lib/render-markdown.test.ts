// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./render-markdown";

describe("renderMarkdown", () => {
  it("renders GitHub-flavoured Markdown", async () => {
    const html = await renderMarkdown("# Title\n\n- one\n- two");

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
  });

  it("treats a single newline as a line break", async () => {
    expect(await renderMarkdown("one\ntwo")).toContain("<br>");
  });

  // Every preview is attacker-controlled: the text arrives from a share link.
  it("strips a script tag out of embedded HTML", async () => {
    const html = await renderMarkdown("<script>window.pwned = 1</script>\n\nhello");

    expect(html).not.toContain("<script");
    expect(html).not.toContain("pwned");
  });

  it("strips an inline event handler", async () => {
    const html = await renderMarkdown('<img src="x" onerror="alert(1)">');

    expect(html).not.toContain("onerror");
  });

  it("strips a javascript: link but keeps a normal one", async () => {
    expect(await renderMarkdown("[x](javascript:alert(1))")).not.toContain("javascript:");
    expect(await renderMarkdown("[x](https://example.com)")).toContain(
      'href="https://example.com"',
    );
  });
});
