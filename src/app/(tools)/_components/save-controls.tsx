"use client";

import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RETENTIONS, type Retention } from "@/lib/domain/value-objects/retention";
import { ToolSelect } from "./tool-select";

const RETENTION_LABELS: Readonly<Record<Retention, string>> = {
  ONE_DAY: "1 day",
  ONE_WEEK: "1 week",
  ONE_MONTH: "1 month",
  ONE_YEAR: "1 year",
};

export function SaveControls({
  retention,
  onRetentionChange,
  onSave,
  saving,
}: {
  readonly retention: Retention;
  readonly onRetentionChange: (next: Retention) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ToolSelect
        label="Expires in"
        value={retention}
        options={RETENTIONS}
        labels={RETENTION_LABELS}
        onChange={onRetentionChange}
      />
      <Button onClick={onSave} disabled={saving}>
        <Link2 />
        {saving ? "Saving…" : "Short Link"}
      </Button>
    </div>
  );
}
