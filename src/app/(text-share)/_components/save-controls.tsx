"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RETENTIONS, type Retention } from "@/lib/domain/value-objects/retention";
import { ToolSelect } from "./tool-select";

const RETENTION_LABELS: Readonly<Record<Retention, string>> = {
  ONE_DAY: "1 day",
  ONE_WEEK: "1 week",
  ONE_MONTH: "1 month",
  ONE_YEAR: "1 year",
};

export function SaveControls({
  saveMode,
  onSaveModeChange,
  retention,
  onRetentionChange,
  onSave,
  saving,
}: {
  readonly saveMode: boolean;
  readonly onSaveModeChange: (next: boolean) => void;
  readonly retention: Retention;
  readonly onRetentionChange: (next: Retention) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="save-to-db"
          checked={saveMode}
          onCheckedChange={(checked) => onSaveModeChange(checked === true)}
        />
        <Label htmlFor="save-to-db" className="cursor-pointer text-sm whitespace-nowrap">
          Short link
        </Label>
      </div>

      {saveMode && (
        <>
          <ToolSelect
            label="Expires in"
            value={retention}
            options={RETENTIONS}
            labels={RETENTION_LABELS}
            onChange={onRetentionChange}
          />
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </div>
  );
}
