"use client";

import { Copy, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/utils";
import type { Retention } from "@/lib/domain/value-objects/retention";
import { FORMAT_CHOICES, FORMAT_LABELS, type FormatChoice } from "@/app/(tools)/_lib/format-choice";
import { SaveControls } from "./save-controls";
import { ToolSelect } from "./tool-select";

/** The header controls that belong to Text Share itself, slotted into AppHeader's actions. */
export function TextShareActions({
  url,
  viewCount,
  choice,
  onChoiceChange,
  onCopy,
  retention,
  onRetentionChange,
  onSave,
  saving,
}: {
  readonly url: string;
  readonly viewCount?: number;
  readonly choice: FormatChoice;
  readonly onChoiceChange: (next: FormatChoice) => void;
  readonly onCopy: () => void;
  readonly retention: Retention;
  readonly onRetentionChange: (next: Retention) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}) {
  return (
    <>
      <ShareUrlField url={url} onCopy={onCopy} {...(viewCount === undefined ? {} : { viewCount })} />

      <ToolSelect
        label="Preview format"
        value={choice}
        options={FORMAT_CHOICES}
        labels={FORMAT_LABELS}
        onChange={onChoiceChange}
      />

      <SaveControls
        retention={retention}
        onRetentionChange={onRetentionChange}
        onSave={onSave}
        saving={saving}
      />
    </>
  );
}

function ShareUrlField({
  url,
  viewCount,
  onCopy,
}: {
  readonly url: string;
  readonly viewCount?: number;
  readonly onCopy: () => void;
}) {
  return (
    <div className="flex min-w-56 flex-1 items-center">
      {/* An <input> cannot hold children, so the count is overlaid and the field gets matching
          right padding — otherwise a long URL scrolls underneath it. */}
      <div className="relative flex min-w-0 flex-1 items-center">
        {/* Read-only input rather than a clickable div: focusing it selects the whole link, which
            is what a keyboard user needs to copy it manually. */}
        <input
          readOnly
          aria-label="Share URL"
          value={url}
          placeholder="The share link appears here"
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            "border-border bg-muted/40 text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:border-input h-8 min-w-0 flex-1 rounded-l-lg border border-r-0 px-2.5 font-mono text-xs focus-visible:relative focus-visible:ring-3 focus-visible:outline-none",
            viewCount !== undefined && "pr-14",
          )}
        />
        {viewCount !== undefined && <ViewCount count={viewCount} />}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onCopy}
        aria-label="Copy share URL"
        title="Copy share URL"
        className="rounded-l-none"
      >
        <Copy />
      </Button>
    </div>
  );
}

// Only the owner is ever sent a count, so its presence is the permission check — there is
// nothing to hide here that the server did not already withhold.
function ViewCount({ count }: { readonly count: number }) {
  const label = `${count.toLocaleString()} ${count === 1 ? "viewer" : "viewers"}`;

  return (
    <span
      title={`Seen by ${label}, not counting you`}
      className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1 text-xs tabular-nums"
    >
      <Eye className="size-3.5" aria-hidden />
      <span className="sr-only">Seen by </span>
      {count.toLocaleString()}
    </span>
  );
}
