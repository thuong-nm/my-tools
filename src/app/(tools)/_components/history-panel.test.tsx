// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TextShareSummaryDto } from "@/lib/application/dto/text-share";
import { HistoryPanel } from "./history-panel";

const SHARE: TextShareSummaryDto = {
  code: "abcdef2345",
  format: "PLAIN",
  createdAtUtc: "2026-09-18T09:20:09.681Z",
  expiresAtUtc: "2026-09-19T09:20:09.681Z",
  expired: false,
};

function answerWith(shares: readonly TextShareSummaryDto[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { shares } }),
    }),
  );
}

// This config does not enable Vitest globals, so Testing Library's automatic cleanup never
// registers and rendered trees would accumulate across tests.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HistoryPanel", () => {
  it("is an icon trigger, and loads nothing until it is opened", () => {
    answerWith([SHARE]);
    render(<HistoryPanel />);

    expect(screen.getByRole("button", { name: "History" })).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches the caller's own shares when opened", async () => {
    answerWith([SHARE]);
    render(<HistoryPanel />);

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => expect(screen.getByText(SHARE.code)).toBeDefined());
    expect(fetch).toHaveBeenCalledWith("/api/text-share", expect.anything());
  });

  it("opens a share from the row itself, with no separate Open control", async () => {
    answerWith([SHARE]);
    render(<HistoryPanel />);

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    await waitFor(() => expect(screen.getByText(SHARE.code)).toBeDefined());

    const row = screen.getByText(SHARE.code).closest("a");
    expect(row?.getAttribute("href")).toBe(`/s/${SHARE.code}`);
    expect(screen.queryByRole("link", { name: "Open" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });

  it("says so when the account has saved nothing", async () => {
    answerWith([]);
    render(<HistoryPanel />);

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => expect(screen.getByText("No saved short links yet")).toBeDefined());
  });
});
