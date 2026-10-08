import { Share2 } from "lucide-react";
import Link from "next/link";

import { TOOL_PATH } from "@/app/(tools)/_lib/routes";

// Mark only, no wordmark: the tool switcher sitting beside it already names where you are.
export function Brand() {
  return (
    <Link
      href={TOOL_PATH}
      aria-label="Text Share home"
      className="focus-visible:ring-ring/50 flex shrink-0 items-center rounded-lg focus-visible:ring-3 focus-visible:outline-none"
    >
      <span className="bg-primary text-primary-foreground grid size-6 place-content-center rounded-md">
        <Share2 className="size-3.5" />
      </span>
    </Link>
  );
}
