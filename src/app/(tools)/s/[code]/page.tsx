import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { recaptchaSiteKey } from "@/app/_lib/recaptcha";
import { hasUnlock } from "@/app/_lib/share-unlock";
import { TextShareTool } from "@/app/(tools)/_components/text-share-tool";
import { UnlockForm } from "@/app/(tools)/_components/unlock-form";
import { getTextShare } from "@/lib/application/use-cases/get-text-share";
import { recordShareView } from "@/lib/application/use-cases/record-share-view";
import { getContainer } from "@/lib/infrastructure/container";

// The title is public by design, so it goes in the tab and the link preview. `robots` stays on
// noindex: a share is unlisted, and a readable title must not make it findable.
export async function generateMetadata({ params }: PageProps<"/s/[code]">): Promise<Metadata> {
  const { code } = await params;

  const { repositories, now } = getContainer();
  // No viewer and no grant, so a protected share answers LOCKED and its title never
  // reaches the tab or a link preview.
  const result = await getTextShare({ code }, { shares: repositories.textShares, now });

  const title = result.ok ? result.value.title : undefined;

  return {
    title: title ?? "Shared text",
    ...(title === undefined ? {} : { openGraph: { title } }),
    robots: { index: false },
  };
}

/** Everything else — a database that did not answer, a corrupt row — is a 500, not a 404. */
const MEANS_NOTHING_HERE: ReadonlySet<string> = new Set([
  "TEXT_SHARE_NOT_FOUND",
  "TEXT_SHARE_EXPIRED",
  "VALIDATION_FAILED",
]);

export default async function SharedTextPage({ params }: PageProps<"/s/[code]">) {
  const { code } = await params;

  const { repositories, now } = getContainer();
  const user = await currentUser();

  await recordView(code, user?.id);

  const result = await getTextShare(
    { code, ...(user ? { viewerId: user.id } : {}), unlocked: await hasUnlock(code) },
    { shares: repositories.textShares, now },
  );

  const siteKey = recaptchaSiteKey();

  if (!result.ok) {
    if (result.error.code === "TEXT_SHARE_LOCKED") {
      return <UnlockForm code={code} {...(siteKey ? { siteKey } : {})} />;
    }
    if (MEANS_NOTHING_HERE.has(result.error.code)) notFound();
    throw new Error(`Could not load share ${code}: ${result.error.message}`);
  }

  return (
    <TextShareTool
      initialShare={result.value}
      {...(user ? { user } : {})}
      {...(siteKey ? { siteKey } : {})}
    />
  );
}

// Counting is a side effect of rendering, so it must never decide whether the page renders: a
// failure here is logged and swallowed rather than turned into a 500 over a statistic.
async function recordView(code: string, viewerId: string | undefined): Promise<void> {
  const { repositories, now, hashViewer, isProbablyBot } = getContainer();

  const incoming = await headers();
  const userAgent = incoming.get("user-agent") ?? undefined;
  if (isProbablyBot(userAgent)) return;

  // Client-controlled unless a trusted proxy overwrites it. It only ever feeds a hash used to
  // separate viewers, so a forged value inflates one share's count and nothing else.
  const ip = incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const recorded = await recordShareView(
    {
      code,
      ...(viewerId ? { viewerId } : {}),
      viewerHash: hashViewer(code, { ip, userAgent }),
    },
    { shares: repositories.textShares, now },
  );

  if (!recorded.ok) console.error(`[views] could not record a view of ${code}`, recorded.error);
}
