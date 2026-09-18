"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { JsonValue } from "@/lib/domain/shared/json";
import type { ContentFormat } from "@/lib/domain/value-objects/content-format";
import { parseMarkup, type MarkupNode } from "@/app/(tools)/_lib/parse-markup";
import { HtmlFrame } from "./html-frame";
import { JsonTree, type TreeExpansion } from "./json-tree";
import { MarkdownPreview } from "./markdown-preview";
import { MarkupTree } from "./markup-tree";
import { Panel } from "./panel";

function parseJson(text: string): JsonValue | undefined {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
}

function PreviewBody({
  text,
  format,
  json,
  markup,
  expansion,
}: {
  readonly text: string;
  readonly format: ContentFormat;
  readonly json: JsonValue | undefined;
  readonly markup: readonly MarkupNode[] | undefined;
  readonly expansion: TreeExpansion;
}) {
  if (!text) return <p className="text-muted-foreground p-4 text-sm">The preview appears here.</p>;

  if (format === "HTML_RENDER") return <HtmlFrame source={text} />;

  if (format === "MARKDOWN") {
    return (
      <div className="p-4">
        <MarkdownPreview source={text} />
      </div>
    );
  }

  if (json !== undefined) {
    return (
      <div className="p-4">
        <JsonTree value={json} expansion={expansion} />
      </div>
    );
  }

  if (markup !== undefined) {
    return (
      <div className="p-4">
        <MarkupTree nodes={markup} expansion={expansion} />
      </div>
    );
  }

  // Unparseable input still shows the text, the same way the original tool did: a half-typed
  // document should not blank the panel.
  return <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>;
}

export function PreviewPanel({
  text,
  format,
}: {
  readonly text: string;
  readonly format: ContentFormat;
}) {
  const [expansion, setExpansion] = useState<TreeExpansion>({ revision: 0, collapsed: false });

  const json = useMemo(
    () => (format === "JSON" && text ? parseJson(text) : undefined),
    [format, text],
  );

  // `parseMarkup` needs DOMParser, so it must not run while prerendering; `text` is empty until
  // the editor hydrates, which is what keeps this off the server.
  const markup = useMemo<readonly MarkupNode[] | undefined>(
    () => ((format === "XML" || format === "HTML") && text ? parseMarkup(text, format) : undefined),
    [format, text],
  );

  const setCollapsed = (collapsed: boolean) =>
    setExpansion((previous) => ({ revision: previous.revision + 1, collapsed }));

  const showsTree = json !== undefined || markup !== undefined;

  return (
    <Panel
      title="Preview"
      bodyClassName={format === "HTML_RENDER" ? "overflow-hidden" : undefined}
      actions={
        showsTree ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => setCollapsed(false)}>
              Expand all
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setCollapsed(true)}>
              Collapse all
            </Button>
          </div>
        ) : undefined
      }
    >
      <PreviewBody
        text={text}
        format={format}
        json={json}
        markup={markup}
        expansion={expansion}
      />
    </Panel>
  );
}
