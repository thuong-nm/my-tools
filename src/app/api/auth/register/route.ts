import { z } from "zod";

import { startSession } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { badRequest, created, errorResponse } from "@/app/api/_lib/responses";
import { registerUser } from "@/lib/application/use-cases/register-user";
import { MAX_EMAIL_LENGTH } from "@/lib/domain/value-objects/email";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { getContainer } from "@/lib/infrastructure/container";

// Shape only. The policy — what makes an address or a password acceptable — belongs to the
// domain, so the minimums live there and are not restated here.
const registerSchema = z.object({
  email: z.string().max(MAX_EMAIL_LENGTH),
  password: z.string().max(MAX_PASSWORD_LENGTH),
});

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const { repositories, generateId, hashPassword } = getContainer();

  const result = await registerUser(parsed.data, {
    users: repositories.users,
    generateId,
    hashPassword,
  });

  if (!result.ok) return errorResponse(result.error);

  await startSession(result.value.id);

  return created({ user: result.value });
}
