"use client";

import { useEffect } from "react";

import { compress } from "@/app/(tools)/_lib/codec";
import { replaceUrl } from "@/app/(tools)/_lib/current-url";
import { TOOL_PATH } from "@/app/(tools)/_lib/routes";

const DEBOUNCE_MS = 250;

// Mirrors the editor into the URL hash. Disabled while a saved share is open, so `/s/<code>`
// is never overwritten with a hash.
export function useHashSync(text: string, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    // `cancelled` is the staleness guard: compression is async, so a run started by an earlier
    // keystroke must not overwrite the URL a later one produced.
    let cancelled = false;

    const timer = setTimeout(() => {
      void compress(text).then((payload) => {
        if (cancelled) return;
        replaceUrl(payload ? `${TOOL_PATH}#${payload}` : TOOL_PATH);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, enabled]);
}
