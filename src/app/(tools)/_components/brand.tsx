import { Share2 } from "lucide-react";
import Link from "next/link";

import { TOOL_PATH } from "@/app/(tools)/_lib/routes";

export function Brand() {
  return (
    <Link
      href={TOOL_PATH}
      className="focus-visible:ring-ring/50 flex shrink-0 items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:outline-none"
    >
      <span className="bg-primary text-primary-foreground grid size-6 place-content-center rounded-md">
        <Share2 className="size-3.5" />
      </span>
      <span className="hidden text-sm font-semibold tracking-tight sm:inline">Text Share</span>
    </Link>
  );
}
