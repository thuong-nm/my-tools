// One place changes the address bar, so everything that displays or copies the share link reads
// the same value. `history.replaceState` fires no event, hence the explicit notifier.
const listeners = new Set<() => void>();

export function subscribeUrl(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

export function currentUrl(): string {
  return window.location.href;
}

/** Empty on the server: there is no address bar to read. */
export function serverUrl(): string {
  return "";
}

export function replaceUrl(next: string): void {
  window.history.replaceState(null, "", next);
  for (const listener of listeners) listener();
}
