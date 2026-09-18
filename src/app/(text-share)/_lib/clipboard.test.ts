import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";

const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText } },
    configurable: true,
  });
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "navigator", original);
});

describe("copyToClipboard", () => {
  it("reports success when the write goes through", async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    expect(await copyToClipboard("https://example.com/s/abc")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/s/abc");
  });

  // Denied permission rejects. Unhandled, that both logs an unhandled rejection and lets the
  // caller tell the user their link was copied when it was not.
  it("reports failure instead of rejecting when the write is denied", async () => {
    stubClipboard(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError");
    });

    await expect(copyToClipboard("anything")).resolves.toBe(false);
  });

  it("reports failure when there is no clipboard at all", async () => {
    Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });

    await expect(copyToClipboard("anything")).resolves.toBe(false);
  });
});
