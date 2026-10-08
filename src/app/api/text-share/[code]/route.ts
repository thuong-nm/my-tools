import { z } from "zod";

import { sessionUserId } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok, unauthenticated } from "@/app/api/_lib/responses";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { updateTextShare } from "@/lib/application/use-cases/update-text-share";
import { MAX_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";
import { MAX_SHARE_TITLE_LENGTH } from "@/lib/domain/value-objects/share-title";
import { getContainer } from "@/lib/infrastructure/container";

// Both fields are optional, and absent means "leave it": the dialog cannot show the current
// password, so an untouched field must never unlock a link. `null` is how removal is asked for.
const updateSchema = z.object({
  title: z.string().max(MAX_SHARE_TITLE_LENGTH + 64).optional(),
  password: z.string().max(MAX_PASSWORD_LENGTH).nullable().optional(),
  recaptchaToken: recaptchaTokenField,
});

// Reading a share here does NOT count as a view: this is the tool fetching its own payload, and
// the page at /s/[code] is the one place a human actually looks at a share.
export async function GET(_request: Request, { params }: RouteContext<"/api/text-share/[code]">) {
  const { code } = await params;

  const viewerId = await sessionUserId();
  const { repositories, now } = getContainer();

  const result = await getTextShare(
    { code, ...(viewerId ? { viewerId } : {}) },
    { shares: repositories.textShares, now },
  );

  return result.ok ? ok({ share: result.value }) : errorResponse(result.error);
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/text-share/[code]">) {
  const { code } = await params;

  const body = await readJson(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "rename_share", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  // Checked before the use case so an anonymous caller gets 401 rather than the 404 that hides
  // other people's codes from a signed-in one.
  const ownerId = await sessionUserId();
  if (!ownerId) return unauthenticated();

  const { repositories, hashPassword } = getContainer();

  const result = await updateTextShare(
    {
      code,
      ownerId,
      ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
      ...(parsed.data.password === undefined ? {} : { password: parsed.data.password }),
    },
    { shares: repositories.textShares, hashPassword },
  );

  return result.ok ? ok({ share: { code, ...result.value } }) : errorResponse(result.error);
}
