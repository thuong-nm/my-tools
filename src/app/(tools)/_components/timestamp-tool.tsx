"use client";

import { useState, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/application/dto/user";
import { parseInstant, toRelative, toUnixSeconds } from "@/app/(tools)/_lib/parse-instant";
import { CopyValueButton } from "./copy-value-button";
import { ToolError, ToolHint, ToolPage } from "./tool-page";

const SOURCE_LABELS = {
  seconds: "Unix seconds",
  milliseconds: "Unix milliseconds",
  iso: "ISO 8601",
} as const;

// Browser-only and never changes, so it is read through useSyncExternalStore rather than synced
// into state by an effect — the cascading-render rule this codebase already learned once.
const subscribeNothing = () => () => {};
const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function TimestampTool({ user }: { readonly user?: UserDto }) {
  const [input, setInput] = useState("");
  const zone = useSyncExternalStore(subscribeNothing, localZone, () => "UTC");

  const result = input.trim() ? parseInstant(input) : null;

  return (
    <ToolPage
      tool="timestamp"
      {...(user ? { user } : {})}
      inputLabel="Unix timestamp or ISO 8601 date"
      placeholder="1700000000"
      value={input}
      onValueChange={setInput}
      actions={
        <div className="flex flex-1 items-center gap-1.5">
          <Button
            variant="outline"
            onClick={() => setInput(String(toUnixSeconds(new Date())))}
          >
            Now
          </Button>
        </div>
      }
    >
      {result === null ? (
        <ToolHint>
          Paste seconds, milliseconds or an ISO date. Ten digits or fewer are read as seconds,
          twelve or more as milliseconds.
        </ToolHint>
      ) : result.ok ? (
        <Conversions date={result.value.date} source={result.value.source} zone={zone} />
      ) : (
        <ToolError message={result.error} />
      )}
    </ToolPage>
  );
}

function Conversions({
  date,
  source,
  zone,
}: {
  readonly date: Date;
  readonly source: keyof typeof SOURCE_LABELS;
  readonly zone: string;
}) {
  const rows = [
    ["Unix seconds", String(toUnixSeconds(date))],
    ["Unix milliseconds", String(date.getTime())],
    ["ISO 8601 (UTC)", date.toISOString()],
    [`Local (${zone})`, date.toLocaleString("en-GB", { timeZoneName: "short" })],
    ["Relative", toRelative(date, new Date())],
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <Badge variant="outline">Read as {SOURCE_LABELS[source]}</Badge>

      <dl className="divide-border border-border divide-y overflow-hidden rounded-lg border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <dt className="text-muted-foreground w-40 shrink-0 text-xs">{label}</dt>
            <dd className="min-w-0 flex-1 font-mono text-xs break-all">{value}</dd>
            <CopyValueButton value={value} />
          </div>
        ))}
      </dl>
    </div>
  );
}
