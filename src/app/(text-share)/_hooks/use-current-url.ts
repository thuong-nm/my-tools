"use client";

import { useSyncExternalStore } from "react";

import { currentUrl, serverUrl, subscribeUrl } from "@/app/(text-share)/_lib/current-url";

/** Empty string until hydrated — the caller renders a placeholder for that first paint. */
export function useCurrentUrl(): string {
  return useSyncExternalStore(subscribeUrl, currentUrl, serverUrl);
}
