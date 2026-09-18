// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseMarkup } from "@/app/(text-share)/_lib/parse-markup";
import { MarkupTree } from "./markup-tree";

const EXPANDED = { revision: 0, collapsed: false };

function renderSource(source: string) {
  return render(<MarkupTree nodes={parseMarkup(source, "XML")} expansion={EXPANDED} />);
}

describe("MarkupTree", () => {
  it("puts an element with a single text child on one line", () => {
    renderSource("<title>Hello</title>");

    expect(screen.getByText("<title")).toBeDefined();
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("</title>")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders an empty element as self-closing, with no toggle", () => {
    renderSource("<hr/>");

    expect(screen.getByText("/>")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows attribute names and values", () => {
    renderSource('<a href="/docs">go</a>');

    expect(screen.getByText("href")).toBeDefined();
    expect(screen.getByText('"/docs"')).toBeDefined();
  });

  it("collapses a branch and puts the closing tag on the summary line", () => {
    renderSource("<ul><li>one</li><li>two</li></ul>");

    expect(screen.getByText("one")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Collapse <ul>" }));

    expect(screen.queryByText("one")).toBeNull();
    expect(screen.getByText("2 children")).toBeDefined();
  });

  // The source is displayed, never mounted: a script tag must stay text on the page.
  it("does not execute the markup it displays", () => {
    renderSource("<div><script>window.pwned = 1</script></div>");

    expect(document.querySelector("script")).toBeNull();
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });
});
