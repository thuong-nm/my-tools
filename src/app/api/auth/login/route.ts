import { z } from "zod";

import { startSession } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok } from "@/app/api/_lib/responses";
import { loginUser } from "@/lib/application/use-cases/login-user";
import { MAX_EMAIL_LENGTH } from "@/lib/domain/value-objects/email";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { getContainer } from "@/lib/infrastructure/container";

const loginSchema = z.object({
  email: z.string().max(MAX_EMAIL_LENGTH),
  password: z.string().max(MAX_PASSWORD_LENGTH),
  recaptchaToken: recaptchaTokenField,
});

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "login", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  const { repositories, verifyPassword } = getContainer();

  const { email, password } = parsed.data;

  const result = await loginUser({ email, password }, { users: repositories.users, verifyPassword });

  if (!result.ok) return errorResponse(result.error);

  await startSession(result.value.id);

  return ok({ user: result.value });
}
