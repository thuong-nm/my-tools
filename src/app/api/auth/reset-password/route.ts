import { z } from "zod";

import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok } from "@/app/api/_lib/responses";
import { resetPassword } from "@/lib/application/use-cases/reset-password";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { getContainer } from "@/lib/infrastructure/container";

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().max(MAX_PASSWORD_LENGTH),
  recaptchaToken: recaptchaTokenField,
});

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "reset_password", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  const { repositories, now, hashPassword, hashResetToken } = getContainer();

  const result = await resetPassword(
    { token: parsed.data.token, password: parsed.data.password },
    { resets: repositories.passwordResets, now, hashPassword, hashResetToken },
  );

  // No session is started: whoever holds the link proved control of the mailbox, not that they
  // are at the keyboard. They sign in with the new password like anyone else.
  return result.ok ? ok({ reset: true }) : errorResponse(result.error);
}
