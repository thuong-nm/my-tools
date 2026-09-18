"use client";

import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/application/dto/user";
import type { Retention } from "@/lib/domain/value-objects/retention";
import { FORMAT_CHOICES, FORMAT_LABELS, type FormatChoice } from "@/app/(text-share)/_lib/format-choice";
import { AccountMenu } from "./account-menu";
import { SaveControls } from "./save-controls";
import { ThemeToggle } from "./theme-toggle";
import { ToolSelect } from "./tool-select";

export function ToolHeader({
  url,
  choice,
  onChoiceChange,
  onCopy,
  onFormat,
  saveMode,
  onSaveModeChange,
  retention,
  onRetentionChange,
  onSave,
  saving,
  user,
}: {
  readonly url: string;
  readonly choice: FormatChoice;
  readonly onChoiceChange: (next: FormatChoice) => void;
  readonly onCopy: () => void;
  readonly onFormat: () => void;
  readonly saveMode: boolean;
  readonly onSaveModeChange: (next: boolean) => void;
  readonly retention: Retention;
  readonly onRetentionChange: (next: Retention) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
  readonly user?: UserDto;
}) {
  return (
    <header className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-3">
      {/* Read-only input rather than a clickable div: focusing it selects the whole link, which
          is what a keyboard user needs to copy it manually. */}
      <input
        readOnly
        aria-label="Share URL"
        value={url}
        placeholder="The share link appears here"
        onFocus={(event) => event.currentTarget.select()}
        className="border-input bg-card text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-50 flex-1 rounded-lg border px-2.5 font-mono text-xs focus-visible:ring-3 focus-visible:outline-none"
      />

      <ToolSelect
        label="Preview format"
        value={choice}
        options={FORMAT_CHOICES}
        labels={FORMAT_LABELS}
        onChange={onChoiceChange}
      />

      <Button variant="outline" size="sm" onClick={onCopy}>
        Copy URL
      </Button>
      <Button variant="outline" size="sm" onClick={onFormat}>
        Format
      </Button>

      <ThemeToggle />

      <SaveControls
        saveMode={saveMode}
        onSaveModeChange={onSaveModeChange}
        retention={retention}
        onRetentionChange={onRetentionChange}
        onSave={onSave}
        saving={saving}
      />

      <AccountMenu user={user} />
    </header>
  );
}
