import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { recaptchaSiteKey } from "@/app/_lib/recaptcha";
import { TextShareTool } from "@/app/(tools)/_components/text-share-tool";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { getContainer } from "@/lib/infrastructure/container";

export const metadata: Metadata = {
  title: "Shared text",
  robots: { index: false },
};

/** Everything else — a database that did not answer, a corrupt row — is a 500, not a 404. */
const MEANS_NOTHING_HERE: ReadonlySet<string> = new Set([
  "TEXT_SHARE_NOT_FOUND",
  "TEXT_SHARE_EXPIRED",
  "VALIDATION_FAILED",
]);

export default async function SharedTextPage({ params }: PageProps<"/s/[code]">) {
  const { code } = await params;

  const { repositories, now } = getContainer();
  const result = await getTextShare({ code }, { shares: repositories.textShares, now });

  if (!result.ok) {
    if (MEANS_NOTHING_HERE.has(result.error.code)) notFound();
    throw new Error(`Could not load share ${code}: ${result.error.message}`);
  }

  const user = await currentUser();
  const siteKey = recaptchaSiteKey();

  return (
    <TextShareTool
      initialShare={result.value}
      {...(user ? { user } : {})}
      {...(siteKey ? { siteKey } : {})}
    />
  );
}
