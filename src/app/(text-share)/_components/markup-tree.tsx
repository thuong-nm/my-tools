"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/components/utils";
import type { MarkupAttribute, MarkupNode } from "@/app/(text-share)/_lib/parse-markup";
import type { TreeExpansion } from "./json-tree";

function Attributes({ attributes }: { attributes: readonly MarkupAttribute[] }) {
  return attributes.map((attribute) => (
    <span key={attribute.name}>
      {" "}
      <span className="text-warning">{attribute.name}</span>
      <span className="text-muted-foreground">=</span>
      <span className="text-success break-all">&quot;{attribute.value}&quot;</span>
    </span>
  ));
}

function OpeningTag({
  tag,
  attributes,
  selfClosing,
}: {
  readonly tag: string;
  readonly attributes: readonly MarkupAttribute[];
  readonly selfClosing?: boolean;
}) {
  return (
    <>
      <span className="text-info">&lt;{tag}</span>
      <Attributes attributes={attributes} />
      <span className="text-info">{selfClosing ? " />" : ">"}</span>
    </>
  );
}

type NodeProps = { readonly node: MarkupNode; readonly startCollapsed: boolean };

function MarkupTreeNode({ node, startCollapsed }: NodeProps) {
  const [open, setOpen] = useState(!startCollapsed);

  if (node.kind === "text") {
    return <div className="text-foreground pl-5 break-words">{node.text}</div>;
  }

  if (node.kind === "comment") {
    return (
      <div className="text-muted-foreground pl-5 break-words italic">
        &lt;!-- {node.text} --&gt;
      </div>
    );
  }

  if (node.children.length === 0) {
    return (
      <div className="pl-5">
        <OpeningTag tag={node.tag} attributes={node.attributes} selfClosing />
      </div>
    );
  }

  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;

  if (onlyChild?.kind === "text") {
    return (
      <div className="pl-5 break-words">
        <OpeningTag tag={node.tag} attributes={node.attributes} />
        {onlyChild.text}
        <span className="text-info">&lt;/{node.tag}&gt;</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-label={open ? `Collapse <${node.tag}>` : `Expand <${node.tag}>`}
          className="hover:text-foreground text-muted-foreground focus-visible:ring-ring mt-[0.2rem] mr-1 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>

        <span className="min-w-0">
          <OpeningTag tag={node.tag} attributes={node.attributes} />
          {!open && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-muted-foreground hover:text-foreground mx-1 cursor-pointer underline decoration-dotted"
              >
                {node.children.length} {node.children.length === 1 ? "child" : "children"}
              </button>
              <span className="text-info">&lt;/{node.tag}&gt;</span>
            </>
          )}
        </span>
      </div>

      {open && (
        <>
          <div className="border-border/70 ml-[0.6rem] border-l pl-2">
            {node.children.map((child, index) => (
              <MarkupTreeNode
                key={index}
                node={child}
                startCollapsed={startCollapsed}
              />
            ))}
          </div>
          <div className="text-info pl-5">&lt;/{node.tag}&gt;</div>
        </>
      )}
    </div>
  );
}

export function MarkupTree({
  nodes,
  expansion,
}: {
  readonly nodes: readonly MarkupNode[];
  readonly expansion: TreeExpansion;
}) {
  return (
    <div key={expansion.revision} className="font-mono text-xs leading-relaxed">
      {nodes.map((node, index) => (
        <MarkupTreeNode key={index} node={node} startCollapsed={expansion.collapsed} />
      ))}
    </div>
  );
}
