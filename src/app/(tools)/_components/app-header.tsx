import type { ReactNode } from "react";

import type { UserDto } from "@/lib/application/dto/user";
import type { ToolId } from "@/app/(tools)/_lib/tool-registry";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { ToolSwitcher } from "./tool-switcher";

// Groups are separated by gap-x-6 and held together internally by gap-1.5 — spacing alone
// carries the grouping, so the row stays readable when it wraps.
export function AppHeader({
  tool,
  actions,
  user,
  siteKey,
}: {
  readonly tool: ToolId;
  readonly actions?: ReactNode;
  readonly user?: UserDto;
  /** Only needed so the history panel can mint a token when renaming. */
  readonly siteKey?: string;
}) {
  return (
    <header className="border-border bg-background flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-2">
        <Brand />
        <ToolSwitcher current={tool} />
      </div>

      {actions ?? <div className="flex-1" />}

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <AccountMenu user={user} {...(siteKey ? { siteKey } : {})} />
      </div>
    </header>
  );
}
