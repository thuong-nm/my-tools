import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { AccountMenu } from "@/app/(text-share)/_components/account-menu";
import { formatTimestamp } from "@/app/(text-share)/_lib/format-timestamp";
import { sharePath, TOOL_PATH } from "@/app/(text-share)/_lib/routes";
import { CopyLinkButton } from "@/app/(text-share)/history/_components/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TextShareSummaryDto } from "@/lib/application/dto/text-share";
import { listUserShares } from "@/lib/application/use-cases/list-user-shares";
import { getContainer } from "@/lib/infrastructure/container";

export const metadata: Metadata = {
  title: "History",
  robots: { index: false },
};

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/history")}`);

  const { repositories, now } = getContainer();

  const result = await listUserShares(
    { ownerId: user.id },
    { shares: repositories.textShares, now },
  );

  // An unreadable history is our failure, not an empty one: showing "no shares yet" to someone
  // who has saved dozens would read as data loss.
  if (!result.ok) {
    throw new Error(`Could not load history for ${user.id}: ${result.error.message}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h1 className="flex-1 text-sm font-medium">Your saved short links</h1>
        <Button variant="outline" size="sm" render={<Link href={TOOL_PATH} />}>
          New share
        </Button>
        <AccountMenu user={user} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {result.value.length === 0 ? <EmptyState /> : <ShareList shares={result.value} />}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <p className="text-sm font-medium">No saved short links yet</p>
      <p className="text-muted-foreground max-w-xs text-sm">
        Tick “Short link” in the editor and save — anything you save while signed in shows up
        here.
      </p>
      <Button size="sm" render={<Link href={TOOL_PATH} />}>
        Open the editor
      </Button>
    </div>
  );
}

function ShareList({ shares }: { readonly shares: readonly TextShareSummaryDto[] }) {
  return (
    <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
      {shares.map((share) => (
        <li
          key={share.code}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-sm">{share.code}</span>
              <Badge variant="outline">{share.format}</Badge>
              {/* Trusted from the server: the viewer's device clock may disagree with the
                  expiry the link is actually served against. */}
              {share.expired && <Badge variant="destructive">Expired</Badge>}
            </div>
            <p className="text-muted-foreground text-xs">
              Saved <time dateTime={share.createdAtUtc}>{formatTimestamp(share.createdAtUtc)}</time>
              {" · "}
              {share.expired ? "Expired" : "Expires"}{" "}
              <time dateTime={share.expiresAtUtc}>{formatTimestamp(share.expiresAtUtc)}</time>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <CopyLinkButton path={sharePath(share.code)} />
            <Button
              variant={share.expired ? "ghost" : "outline"}
              size="sm"
              render={<Link href={sharePath(share.code)} />}
            >
              Open
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
