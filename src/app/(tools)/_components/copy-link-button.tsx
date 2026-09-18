"use client";

import { useState } from "react";

import { copyToClipboard } from "@/app/(tools)/_lib/clipboard";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path }: { readonly path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  // Built at click time rather than rendered into the markup: the server does not know which
  // host the visitor reached it on, and a use case may not read APP_URL (rule 7).
  const copy = async () => {
    const ok = await copyToClipboard(new URL(path, window.location.origin).toString());
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1500);
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : "Copy link"}
    </Button>
  );
}
