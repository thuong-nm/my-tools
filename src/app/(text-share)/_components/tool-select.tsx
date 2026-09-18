"use client";

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
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cn(
        "border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 cursor-pointer rounded-lg border px-2 text-sm focus-visible:ring-3 focus-visible:outline-none",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
