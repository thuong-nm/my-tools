import { z } from "zod";

import { startSession } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { badRequest, errorResponse, ok } from "@/app/api/_lib/responses";
import { loginUser } from "@/lib/application/use-cases/login-user";
import { MAX_EMAIL_LENGTH } from "@/lib/domain/value-objects/email";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { getContainer } from "@/lib/infrastructure/container";

const loginSchema = z.object({
  email: z.string().max(MAX_EMAIL_LENGTH),
  password: z.string().max(MAX_PASSWORD_LENGTH),
});

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const { repositories, verifyPassword } = getContainer();

  const result = await loginUser(parsed.data, { users: repositories.users, verifyPassword });

  if (!result.ok) return errorResponse(result.error);

  await startSession(result.value.id);

  return ok({ user: result.value });
}
