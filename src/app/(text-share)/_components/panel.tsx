import type { ReactNode } from "react";

import { cn } from "@/components/utils";

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  readonly title: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-1 basis-0 flex-col", className)}>
      <header className="border-border bg-card text-muted-foreground flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3 text-xs font-medium tracking-wide uppercase">
        <h2>{title}</h2>
        {actions}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>
    </section>
  );
}
