"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/application/dto/user";
import { decodeBase64, encodeBase64 } from "@/app/(tools)/_lib/base64";
import { CopyValueButton } from "./copy-value-button";
import { ToolError, ToolHint, ToolPage } from "./tool-page";

type Direction = "encode" | "decode";

export function Base64Tool({ user }: { readonly user?: UserDto }) {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [urlSafe, setUrlSafe] = useState(false);

  const trimmed = input.trim();

  return (
    <ToolPage
      tool="base64"
      {...(user ? { user } : {})}
      inputLabel={direction === "encode" ? "Text" : "Base64"}
      placeholder={direction === "encode" ? "Xin chào" : "WGluIGNow6Bv"}
      value={input}
      onValueChange={setInput}
      actions={
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <Button
            variant={direction === "encode" ? "default" : "outline"}
            onClick={() => setDirection("encode")}
          >
            Encode
          </Button>
          <Button
            variant={direction === "decode" ? "default" : "outline"}
            onClick={() => setDirection("decode")}
          >
            Decode
          </Button>
          {direction === "encode" && (
            <Button variant={urlSafe ? "secondary" : "ghost"} onClick={() => setUrlSafe(!urlSafe)}>
              URL-safe
            </Button>
          )}
        </div>
      }
    >
      {!trimmed ? (
        <ToolHint>
          {direction === "encode"
            ? "Type text to encode it. URL-safe swaps +/ for -_ and drops the padding."
            : "Paste Base64 or Base64url — either alphabet decodes, padded or not."}
        </ToolHint>
      ) : direction === "encode" ? (
        <Output value={encodeBase64(input, urlSafe)} />
      ) : (
        <DecodedOutput value={trimmed} />
      )}
    </ToolPage>
  );
}

function DecodedOutput({ value }: { readonly value: string }) {
  const result = decodeBase64(value);

  return result.ok ? <Output value={result.value} /> : <ToolError message={result.error} />;
}

function Output({ value }: { readonly value: string }) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-muted-foreground flex-1 text-xs font-medium">
          Result · {value.length.toLocaleString()} chars
        </h2>
        <CopyValueButton value={value} />
      </div>
      <pre className="bg-muted/40 border-border overflow-auto rounded-lg border p-2.5 font-mono text-xs break-all whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
