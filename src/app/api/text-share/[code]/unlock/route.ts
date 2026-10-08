import { z } from "zod";

import { grantUnlock } from "@/app/_lib/share-unlock";
import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok } from "@/app/api/_lib/responses";
import { unlockTextShare } from "@/lib/application/use-cases/unlock-text-share";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { getContainer } from "@/lib/infrastructure/container";

const unlockSchema = z.object({
  password: z.string().max(MAX_PASSWORD_LENGTH),
  recaptchaToken: recaptchaTokenField,
});

// Nothing here throttles guessing beyond reCAPTCHA and scrypt's own cost — the same gap
// AGENTS.md records for sign-in.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/text-share/[code]/unlock">,
) {
  const { code } = await params;

  const body = await readJson(request);
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "unlock_share", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  const { repositories, verifyPassword, now } = getContainer();

  const result = await unlockTextShare(
    { code, password: parsed.data.password },
    { shares: repositories.textShares, verifyPassword, now },
  );

  if (!result.ok) return errorResponse(result.error);

  await grantUnlock(code);

  return ok({ unlocked: true });
}
