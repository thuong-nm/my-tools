"use client";

import { useSyncExternalStore } from "react";

// The class on <html> is the single source of truth (the palettes in styles/theme.css hang off
// `.dark`), so this reads it rather than keeping a second copy in state. Read through
// `useSyncExternalStore`, not an effect that calls setState.
const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Light on the server: nothing there can know the visitor's choice. */
function serverSnapshot(): boolean {
  return false;
}

export function useTheme(): { readonly isDark: boolean; readonly toggle: () => void } {
  const dark = useSyncExternalStore(subscribe, isDark, serverSnapshot);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Private mode or blocked storage: the toggle still works for this page view.
    }

    for (const listener of listeners) listener();
  };

  return { isDark: dark, toggle };
}
