import { z } from "zod";

import { sessionUserId } from "@/app/_lib/session";
import { readJson } from "@/app/api/_lib/request";
import { recaptchaTokenField, rejectIfNotHuman } from "@/app/api/_lib/require-human";
import { badRequest, created, errorResponse, ok, unauthenticated } from "@/app/api/_lib/responses";
import { createTextShare } from "@/lib/application/use-cases/create-text-share";
import { listUserShares, MAX_HISTORY_LIMIT } from "@/lib/application/use-cases/list-user-shares";
import { CONTENT_FORMATS } from "@/lib/domain/value-objects/content-format";
import { RETENTIONS } from "@/lib/domain/value-objects/retention";
import { MAX_SHARED_TEXT_LENGTH } from "@/lib/domain/value-objects/shared-text";
import { getContainer } from "@/lib/infrastructure/container";

// `content` arrives already compressed by the browser: the URL-hash mode has to work with no
// server at all, so the codec lives there and this is an opaque payload.
const createTextShareSchema = z.object({
  content: z.string().min(1).max(MAX_SHARED_TEXT_LENGTH),
  format: z.enum(CONTENT_FORMATS),
  retention: z.enum(RETENTIONS),
  recaptchaToken: recaptchaTokenField,
});

// An object, not a bare number, so a rejection names `limit` instead of Zod's anonymous path.
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_HISTORY_LIMIT).optional(),
});

// There is deliberately no `ownerId` in the schema: it comes from the session, so a caller
// cannot file a share into somebody else's history.
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = createTextShareSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const rejected = await rejectIfNotHuman(request, "save_share", parsed.data.recaptchaToken);
  if (rejected) return rejected;

  const ownerId = await sessionUserId();

  const { repositories, now, generateId, generateShareCode } = getContainer();

  const { content, format, retention } = parsed.data;

  const result = await createTextShare(
    { content, format, retention, ...(ownerId ? { ownerId } : {}) },
    { shares: repositories.textShares, now, generateId, generateShareCode },
  );

  return result.ok ? created({ share: result.value }) : errorResponse(result.error);
}

/** The caller's own history. Scoped by the session, never by a query parameter. */
export async function GET(request: Request) {
  const ownerId = await sessionUserId();
  if (!ownerId) return unauthenticated();

  const raw = new URL(request.url).searchParams.get("limit");
  const query = historyQuerySchema.safeParse(raw === null ? {} : { limit: raw });
  if (!query.success) return badRequest(query.error);

  const { repositories, now } = getContainer();

  const result = await listUserShares(
    { ownerId, ...(query.data.limit === undefined ? {} : { limit: query.data.limit }) },
    { shares: repositories.textShares, now },
  );

  return result.ok ? ok({ shares: result.value }) : errorResponse(result.error);
}
