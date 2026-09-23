import { sessionUserId } from "@/app/_lib/session";
import { errorResponse, ok } from "@/app/api/_lib/responses";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { getContainer } from "@/lib/infrastructure/container";

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
