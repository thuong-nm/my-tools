import { cookies } from "next/headers";

import { serverConfig } from "@/lib/config";
import {
  SESSION_LIFETIME_DAYS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/infrastructure/auth/session-token";

// The ONE module that reads the session secret. Everything else — pages, route handlers — asks
// this file, so the key has a single holder and a single expiry policy (rule 7).
const COOKIE_NAME = "session";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function startSession(userId: string): Promise<void> {
  const config = serverConfig();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_DAYS * MS_PER_DAY);

  const store = await cookies();

  store.set(COOKIE_NAME, signSessionToken({ userId, expiresAt, secret: config.session.secret }), {
    // Unreadable to scripts, not sent on cross-site POSTs, and HTTPS-only once deployed.
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in user's id, or undefined when the cookie is missing, forged or expired. */
export async function sessionUserId(): Promise<string | undefined> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return undefined;

  return verifySessionToken({ token, secret: serverConfig().session.secret, now: new Date() });
}
