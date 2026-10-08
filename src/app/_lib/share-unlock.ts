import { cookies } from "next/headers";

import { serverConfig } from "@/lib/config";
import {
  UNLOCK_LIFETIME_HOURS,
  signUnlockToken,
  verifyUnlockToken,
} from "@/lib/infrastructure/auth/unlock-token";
import { sharePath } from "@/app/(tools)/_lib/routes";

// Alongside session.ts as a holder of the signing secret (rule 7). One cookie per share, and
// scoped to that share's path, so opening one protected link does not attach a grant to every
// other request — and a stolen cookie opens exactly the link it was issued for.
const MS_PER_HOUR = 60 * 60 * 1000;

const cookieName = (code: string) => `unlock_${code}`;

export async function grantUnlock(code: string): Promise<void> {
  const config = serverConfig();
  const expiresAt = new Date(Date.now() + UNLOCK_LIFETIME_HOURS * MS_PER_HOUR);

  (await cookies()).set(cookieName(code), signUnlockToken({ code, expiresAt, secret: config.session.secret }), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: sharePath(code),
    expires: expiresAt,
  });
}

/** Whether this browser already proved it knows the password, within the last 24 hours. */
export async function hasUnlock(code: string): Promise<boolean> {
  const token = (await cookies()).get(cookieName(code))?.value;
  if (!token) return false;

  return verifyUnlockToken({
    token,
    code,
    secret: serverConfig().session.secret,
    now: new Date(),
  });
}
