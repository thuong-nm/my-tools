import { errorResponse, ok } from "@/app/api/_lib/responses";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { getContainer } from "@/lib/infrastructure/container";

export async function GET(_request: Request, { params }: RouteContext<"/api/text-share/[code]">) {
  const { code } = await params;

  const { repositories, now } = getContainer();

  const result = await getTextShare({ code }, { shares: repositories.textShares, now });

  return result.ok ? ok({ share: result.value }) : errorResponse(result.error);
}
