"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "split-ratio";

export const DEFAULT_SPLIT_RATIO = 0.5;
export const MIN_SPLIT_RATIO = 0.2;
export const MAX_SPLIT_RATIO = 0.8;

const listeners = new Set<() => void>();

// Cached because getSnapshot runs on every render: re-reading localStorage each time is a
// synchronous main-thread hit for a value only this module ever changes.
let cached: number | undefined;

export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_RATIO;

  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

function snapshot(): number {
  if (cached !== undefined) return cached;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cached = stored === null ? DEFAULT_SPLIT_RATIO : clampSplitRatio(Number(stored));
  } catch {
    cached = DEFAULT_SPLIT_RATIO;
  }

  return cached;
}

/** Even split on the server: nothing there can know what this visitor dragged it to. */
function serverSnapshot(): number {
  return DEFAULT_SPLIT_RATIO;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSplitRatio(next: number): void {
  cached = clampSplitRatio(next);

  try {
    window.localStorage.setItem(STORAGE_KEY, String(cached));
  } catch {
    // Private mode or blocked storage: the split still holds for this page view.
  }

  for (const listener of listeners) listener();
}

/** The share of the width the first pane takes, as a fraction. */
export function useSplitRatio(): number {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
