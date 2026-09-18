// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonTree } from "./json-tree";

const EXPANDED = { revision: 0, collapsed: false };

describe("JsonTree", () => {
  it("renders every scalar kind with its punctuation", () => {
    render(
      <JsonTree
        value={{ text: "hi", count: 2, flag: true, missing: null }}
        expansion={EXPANDED}
      />,
    );

    expect(screen.getByText('"text"')).toBeDefined();
    expect(screen.getByText('"hi"')).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("true")).toBeDefined();
    expect(screen.getByText("null")).toBeDefined();
  });

  it("collapses a branch to a summary and expands it again", () => {
    render(<JsonTree value={{ items: [1, 2, 3] }} expansion={EXPANDED} />);

    expect(screen.getByText("1")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Collapse items" }));

    expect(screen.queryByText("1")).toBeNull();
    expect(screen.getByText("3 items")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Expand items" }));

    expect(screen.getByText("1")).toBeDefined();
  });

  it("starts every branch closed when the expansion says collapsed", () => {
    render(
      <JsonTree value={{ a: { b: 1 } }} expansion={{ revision: 1, collapsed: true }} />,
    );

    expect(screen.queryByText('"b"')).toBeNull();
    expect(screen.getByText("1 key")).toBeDefined();
  });

  it("shows an empty object and an empty array without a toggle", () => {
    render(<JsonTree value={{ o: {}, a: [] }} expansion={EXPANDED} />);

    expect(screen.getByText("{}")).toBeDefined();
    expect(screen.getByText("[]")).toBeDefined();
  });

  it("escapes nothing into markup — a string that looks like a tag stays text", () => {
    render(<JsonTree value={{ html: "<img onerror=alert(1)>" }} expansion={EXPANDED} />);

    expect(screen.getByText('"<img onerror=alert(1)>"')).toBeDefined();
    expect(document.querySelector("img")).toBeNull();
  });
});
