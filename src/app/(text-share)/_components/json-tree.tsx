"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/components/utils";
import type { JsonPrimitive, JsonValue } from "@/lib/domain/shared/json";

type Entry = { readonly label: string | null; readonly value: JsonValue };

function entriesOf(value: JsonValue): readonly Entry[] | null {
  if (Array.isArray(value)) {
    return value.map((item) => ({ label: null, value: item }));
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([label, item]) => ({ label, value: item as JsonValue }));
  }

  return null;
}

function Primitive({ value }: { value: JsonPrimitive }) {
  if (value === null) return <span className="text-muted-foreground">null</span>;

  if (typeof value === "string") {
    return <span className="text-success break-all">&quot;{value}&quot;</span>;
  }

  if (typeof value === "number") return <span className="text-violet">{value}</span>;

  return <span className="text-warning">{String(value)}</span>;
}

function Label({ label }: { label: string | null }) {
  if (label === null) return null;

  return (
    <>
      <span className="text-info">&quot;{label}&quot;</span>
      <span className="text-muted-foreground">: </span>
    </>
  );
}

type NodeProps = {
  readonly label: string | null;
  readonly value: JsonValue;
  readonly isLast: boolean;
  readonly startCollapsed: boolean;
};

function JsonNode({ label, value, isLast, startCollapsed }: NodeProps) {
  const [open, setOpen] = useState(!startCollapsed);
  const entries = entriesOf(value);
  const comma = isLast ? null : <span className="text-muted-foreground">,</span>;

  if (entries === null) {
    return (
      <div className="pl-5">
        <Label label={label} />
        <Primitive value={value as JsonPrimitive} />
        {comma}
      </div>
    );
  }

  const [opening, closing] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return (
      <div className="pl-5">
        <Label label={label} />
        <span className="text-muted-foreground">
          {opening}
          {closing}
        </span>
        {comma}
      </div>
    );
  }

  const summary = Array.isArray(value)
    ? `${entries.length} ${entries.length === 1 ? "item" : "items"}`
    : `${entries.length} ${entries.length === 1 ? "key" : "keys"}`;

  return (
    <div>
      <div className="flex items-start">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${label ?? summary}` : `Expand ${label ?? summary}`}
          className="hover:text-foreground text-muted-foreground focus-visible:ring-ring mt-[0.2rem] mr-1 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>

        <span className="min-w-0">
          <Label label={label} />
          <span className="text-muted-foreground">{opening}</span>
          {!open && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-muted-foreground hover:text-foreground mx-1 cursor-pointer underline decoration-dotted"
              >
                {summary}
              </button>
              <span className="text-muted-foreground">{closing}</span>
              {comma}
            </>
          )}
        </span>
      </div>

      {open && (
        <>
          <div className="border-border/70 ml-[0.6rem] border-l pl-2">
            {entries.map((entry, index) => (
              <JsonNode
                key={entry.label ?? index}
                label={entry.label}
                value={entry.value}
                isLast={index === entries.length - 1}
                startCollapsed={startCollapsed}
              />
            ))}
          </div>
          <div className="text-muted-foreground pl-5">
            {closing}
            {comma}
          </div>
        </>
      )}
    </div>
  );
}

export type TreeExpansion = {
  /** Bumped on every expand-all / collapse-all so the tree remounts at the new default. */
  readonly revision: number;
  readonly collapsed: boolean;
};

export function JsonTree({
  value,
  expansion,
}: {
  readonly value: JsonValue;
  readonly expansion: TreeExpansion;
}) {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <JsonNode
        key={expansion.revision}
        label={null}
        value={value}
        isLast
        startCollapsed={expansion.collapsed}
      />
    </div>
  );
}
