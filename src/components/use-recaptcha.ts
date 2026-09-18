"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    readonly grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// recaptcha.net rather than google.com: Google's own alternative host, for networks where
// google.com is blocked or unreliable. Same keys, same tokens.
const SCRIPT_HOST = "https://www.recaptcha.net";

function loadScript(siteKey: string): Promise<void> {
  const src = `${SCRIPT_HOST}/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The reCAPTCHA script could not be loaded."));
    document.head.appendChild(script);
  });
}

/**
 * `execute` resolves to "" when reCAPTCHA is switched off, which the server reads as "no token".
 * With the group unconfigured it verifies with a noop; with it configured, an empty token is a
 * rejection — so a broken script fails closed rather than quietly skipping the check.
 */
export function useRecaptcha(siteKey: string | undefined) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;
    void loadScript(siteKey)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  const execute = useCallback(
    async (action: string): Promise<string> => {
      const grecaptcha = window.grecaptcha;
      if (!siteKey || !ready || !grecaptcha) return "";

      return new Promise<string>((resolve) => {
        grecaptcha.ready(() => {
          grecaptcha.execute(siteKey, { action }).then(resolve, () => resolve(""));
        });
      });
    },
    [siteKey, ready],
  );

  return { execute, ready };
}
