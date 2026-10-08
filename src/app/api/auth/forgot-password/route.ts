import { z } from "zod";

import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok } from "@/app/api/_lib/responses";
import { requestPasswordReset } from "@/lib/application/use-cases/request-password-reset";
import { serverConfig } from "@/lib/config";
import { MAX_EMAIL_LENGTH } from "@/lib/domain/value-objects/email";
import { getContainer } from "@/lib/infrastructure/container";

const forgotPasswordSchema = z.object({
  email: z.string().max(MAX_EMAIL_LENGTH),
  recaptchaToken: recaptchaTokenField,
});

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "forgot_password", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  const { repositories, notifier, now, generateResetToken, passwordResetTtlMs } = getContainer();

  const result = await requestPasswordReset(
    { email: parsed.data.email },
    {
      users: repositories.users,
      resets: repositories.passwordResets,
      notifier,
      now,
      generateResetToken,
      // Built here, not in the use case: a use case may not read APP_URL (rule 7).
      resetUrl: (token) =>
        `${serverConfig().appUrl}/reset-password?token=${encodeURIComponent(token)}`,
      ttlMs: passwordResetTtlMs,
    },
  );

  return result.ok ? ok({ requested: true }) : errorResponse(result.error);
}
