"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/app/(tools)/_lib/clipboard";

export function CopyValueButton({ value }: { readonly value: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    setState((await copyToClipboard(value)) ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1500);
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : "Copy"}
    </Button>
  );
}
