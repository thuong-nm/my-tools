import { z } from "zod";

import { errorResponse } from "@/app/api/_lib/responses";
import { getContainer } from "@/lib/infrastructure/container";

/** The actions a token may be minted for. The adapter rejects a token issued for another one. */
export const RECAPTCHA_ACTIONS = [
  "login",
  "register",
  "save_share",
  "forgot_password",
  "reset_password",
  "rename_share",
] as const;

export type RecaptchaAction = (typeof RECAPTCHA_ACTIONS)[number];

// Every protected body carries it, so the field is declared once here rather than in each schema.
export const recaptchaTokenField = z.string().max(4096).default("");

/**
 * Fail-closed: anything other than a clean pass — a low score, a wrong action, a network error,
 * a bad secret — returns a response, so a caller that ignores the result cannot let a bot past.
 */
export async function rejectIfNotHuman(
  request: Request,
  action: RecaptchaAction,
  token: string,
): Promise<Response | null> {
  const { verifyHuman } = getContainer();
  const ip = clientIp(request);

  const result = await verifyHuman({ token, action, ...(ip ? { ip } : {}) });

  return result.ok ? null : errorResponse(result.error);
}

// Client-controlled unless a trusted proxy overwrites it, which is why it is only ever passed
// upstream as a signal and never trusted here.
function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || (request.headers.get("x-real-ip") ?? undefined);
}
