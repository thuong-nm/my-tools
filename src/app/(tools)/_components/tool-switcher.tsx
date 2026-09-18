"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TOOLS, toolById, type ToolId } from "@/app/(tools)/_lib/tool-registry";

export function ToolSwitcher({ current }: { readonly current: ToolId }) {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="outline" />}>
        {toolById(current).name}
        <ChevronDown className="text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Menu.Popup className="bg-popover text-popover-foreground border-border w-64 rounded-xl border p-1 shadow-lg outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {TOOLS.map((tool) => (
              // LinkItem rather than Item: these navigate, so they must be real anchors that
              // middle-click and "open in new tab" still work on.
              <Menu.LinkItem
                key={tool.id}
                href={tool.path}
                className="data-highlighted:bg-muted flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 outline-none select-none"
              >
                <Check
                  className={`mt-0.5 size-3.5 shrink-0 ${tool.id === current ? "" : "invisible"}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{tool.name}</span>
                  <span className="text-muted-foreground text-xs">{tool.summary}</span>
                </span>
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
