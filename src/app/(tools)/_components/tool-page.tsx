"use client";

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserDto } from "@/lib/application/dto/user";
import type { ToolId } from "@/app/(tools)/_lib/tool-registry";
import { AppHeader } from "./app-header";

/** The two-pane shell every utility tool shares: an input on the left, its reading on the right. */
export function ToolPage({
  tool,
  user,
  inputLabel,
  placeholder,
  value,
  onValueChange,
  actions,
  children,
}: {
  readonly tool: ToolId;
  readonly user?: UserDto;
  readonly inputLabel: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader tool={tool} {...(user ? { user } : {})} {...(actions ? { actions } : {})} />

      <main className="divide-border flex min-h-0 flex-1 flex-col divide-y md:flex-row md:divide-x md:divide-y-0">
        <section className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          <Label htmlFor="tool-input" className="text-muted-foreground text-xs font-medium">
            {inputLabel}
          </Label>
          <Textarea
            id="tool-input"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="min-h-40 flex-1 resize-none font-mono text-sm"
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{children}</section>
      </main>
    </div>
  );
}

export function ToolError({ message }: { readonly message: string }) {
  return <p className="text-destructive text-sm">{message}</p>;
}

export function ToolHint({ children }: { readonly children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
