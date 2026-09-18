"use client";

import { Dialog } from "@base-ui/react/dialog";
import { History, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TextShareSummaryDto } from "@/lib/application/dto/text-share";
import { ApiError, apiFetch } from "@/lib/http/client";
import { formatTimestamp } from "@/app/(tools)/_lib/format-timestamp";
import { sharePath } from "@/app/(tools)/_lib/routes";
import { CopyLinkButton } from "./copy-link-button";

export function HistoryPanel() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={<Button variant="ghost" size="icon" aria-label="History" title="History" />}
      >
        <History />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="bg-background border-border fixed top-0 right-0 z-50 flex h-dvh w-full max-w-sm flex-col border-l shadow-xl transition-transform duration-200 outline-none data-ending-style:translate-x-full data-starting-style:translate-x-full">
          <div className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
            <Dialog.Title className="flex-1 text-sm font-medium">
              Your saved short links
            </Dialog.Title>
            <Dialog.Close
              render={<Button variant="ghost" size="icon" aria-label="Close history" />}
            >
              <X />
            </Dialog.Close>
          </div>

          {/* Mounted only while open, so a fresh fetch runs on every open and the loading state
              is the absence of data rather than a flag an effect has to set. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <HistoryList />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HistoryList() {
  const [shares, setShares] = useState<readonly TextShareSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void apiFetch<{ readonly shares: readonly TextShareSummaryDto[] }>("/api/text-share", {
      signal: controller.signal,
      fallbackMessage: "Could not load your history.",
    })
      .then((data) => setShares(data.shares))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : "Could not load your history.");
      });

    return () => controller.abort();
  }, []);

  if (error !== null) {
    return <p className="text-destructive px-1 py-6 text-center text-sm">{error}</p>;
  }

  if (shares === null) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="border-border mt-2 flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No saved short links yet</p>
        <p className="text-muted-foreground text-sm">
          Press “Short Link” in the editor — anything you save while signed in shows up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {shares.map((share) => (
        <li key={share.code} className="hover:bg-muted/50 flex items-center gap-1.5 rounded-lg pr-2 transition-colors">
          {/* Close and navigate in one press: Dialog.Close only flips the open state, so the
              link's own navigation still happens. */}
          <Dialog.Close
            nativeButton={false}
            render={<Link href={sharePath(share.code)} />}
            className="focus-visible:ring-ring/50 flex min-w-0 flex-1 flex-col gap-1 rounded-lg px-2 py-2 text-left focus-visible:ring-3 focus-visible:outline-none"
          >
            <span className="flex items-center gap-2">
              <span className="truncate font-mono text-sm">{share.code}</span>
              <Badge variant="outline">{share.format}</Badge>
              {/* Trusted from the server: the viewer's device clock may disagree with the
                  expiry the link is actually served against. */}
              {share.expired && <Badge variant="destructive">Expired</Badge>}
            </span>

            <span className="text-muted-foreground text-xs">
              Saved <time dateTime={share.createdAtUtc}>{formatTimestamp(share.createdAtUtc)}</time>
              {" · "}
              {share.expired ? "Expired" : "Expires"}{" "}
              <time dateTime={share.expiresAtUtc}>{formatTimestamp(share.expiresAtUtc)}</time>
            </span>
          </Dialog.Close>

          <CopyLinkButton path={sharePath(share.code)} />
        </li>
      ))}
    </ul>
  );
}
