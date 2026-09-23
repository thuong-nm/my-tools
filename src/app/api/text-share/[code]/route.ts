import { z } from "zod";

import { sessionUserId } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, errorResponse, ok, unauthenticated } from "@/app/api/_lib/responses";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { renameTextShare } from "@/lib/application/use-cases/rename-text-share";
import { MAX_SHARE_TITLE_LENGTH } from "@/lib/domain/value-objects/share-title";
import { getContainer } from "@/lib/infrastructure/container";

// A little slack over the domain cap so trailing whitespace is trimmed rather than rejected.
const renameSchema = z.object({
  title: z.string().max(MAX_SHARE_TITLE_LENGTH + 64),
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
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "rename_share", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  // Checked before the use case so an anonymous caller gets 401 rather than the 404 that hides
  // other people's codes from a signed-in one.
  const ownerId = await sessionUserId();
  if (!ownerId) return unauthenticated();

  const { repositories } = getContainer();

  const result = await renameTextShare(
    { code, ownerId, title: parsed.data.title },
    { shares: repositories.textShares },
  );

  return result.ok
    ? ok({ share: { code, ...(result.value === undefined ? {} : { title: result.value }) } })
    : errorResponse(result.error);
}
