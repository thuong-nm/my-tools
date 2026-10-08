"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/components/utils";
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  setSplitRatio,
  useSplitRatio,
} from "@/app/(tools)/_hooks/use-split-ratio";

const KEYBOARD_STEP = 0.02;

/**
 * Side by side with a draggable rule from `md` up; stacked and unresizable below it, where the
 * panes are one above the other and a width has nothing to divide.
 */
export function ResizableSplit({ start, end }: { readonly start: ReactNode; readonly end: ReactNode }) {
  const stored = useSplitRatio();
  const [dragging, setDragging] = useState<number | null>(null);
  const row = useRef<HTMLElement>(null);
  // Mirrored in a ref because pointerup can arrive in the same task as the last pointermove,
  // before React re-renders — a handler reading state would then commit a stale position.
  const live = useRef<number | null>(null);

  // The live drag wins while it lasts, so the pane follows the pointer without a localStorage
  // write per frame; the store is told once, on release.
  const ratio = dragging ?? stored;

  const ratioAt = (clientX: number): number | undefined => {
    const bounds = row.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return undefined;

    return clampSplitRatio((clientX - bounds.left) / bounds.width);
  };

  const nudge = (delta: number) => setSplitRatio(ratio + delta);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const handled: Record<string, () => void> = {
      ArrowLeft: () => nudge(-KEYBOARD_STEP),
      ArrowRight: () => nudge(KEYBOARD_STEP),
      Home: () => setSplitRatio(MIN_SPLIT_RATIO),
      End: () => setSplitRatio(MAX_SPLIT_RATIO),
      Enter: () => setSplitRatio(DEFAULT_SPLIT_RATIO),
    };

    const action = handled[event.key];
    if (!action) return;

    event.preventDefault();
    action();
  };

  return (
    <main
      ref={row}
      style={{ "--split": `${ratio * 100}%` } as CSSProperties}
      className={cn(
        "divide-border flex min-h-0 flex-1 flex-col divide-y md:flex-row md:divide-y-0",
        dragging !== null && "cursor-col-resize select-none",
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-none md:basis-[var(--split)]">
        {start}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(MIN_SPLIT_RATIO * 100)}
        aria-valuemax={Math.round(MAX_SPLIT_RATIO * 100)}
        tabIndex={0}
        // `touch-none` so a drag on a touchscreen resizes instead of scrolling the page.
        className="group focus-visible:ring-ring/50 relative hidden w-px shrink-0 cursor-col-resize touch-none focus-visible:ring-3 focus-visible:outline-none md:block"
        onKeyDown={onKeyDown}
        onDoubleClick={() => setSplitRatio(DEFAULT_SPLIT_RATIO)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          live.current = ratio;
          setDragging(ratio);
        }}
        onPointerMove={(event) => {
          if (live.current === null) return;

          const next = ratioAt(event.clientX);
          if (next === undefined) return;

          live.current = next;
          setDragging(next);
        }}
        onPointerUp={() => {
          if (live.current !== null) setSplitRatio(live.current);
          live.current = null;
          setDragging(null);
        }}
        onPointerCancel={() => {
          live.current = null;
          setDragging(null);
        }}
      >
        <span
          aria-hidden
          className={cn(
            "bg-border group-hover:bg-ring group-focus-visible:bg-ring absolute inset-y-0 left-0 w-px transition-colors",
            dragging !== null && "bg-ring",
          )}
        />
        {/* A 1px rule is the right look and the wrong target, so the grab area is widened
            invisibly either side of it. */}
        <span aria-hidden className="absolute inset-y-0 -left-1.5 w-3.5" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{end}</div>
    </main>
  );
}
