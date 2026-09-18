import { serverConfig } from "@/lib/config";

// Rule 7 names app/_lib as one of the three modules that may read config. The SITE key is public
// by design — it ships in the page — but it still comes through here rather than through
// NEXT_PUBLIC_*, so `process.env` stays confined to lib/config.ts.
export function recaptchaSiteKey(): string | undefined {
  const { recaptcha } = serverConfig();

  return recaptcha.enabled ? recaptcha.siteKey : undefined;
}
