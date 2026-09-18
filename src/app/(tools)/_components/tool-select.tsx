"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/components/utils";

type ToolSelectProps<T extends string> = {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly labels: Readonly<Record<T, string>>;
  readonly onChange: (value: T) => void;
  readonly className?: string;
};

export function ToolSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  className,
}: ToolSelectProps<T>) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="border-border bg-background text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-8 cursor-pointer appearance-none rounded-lg border py-0 pr-7 pl-2.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
      />
    </div>
  );
}
