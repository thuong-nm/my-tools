"use client";

import { useEffect, useState } from "react";

import { renderMarkdown } from "@/app/(tools)/_lib/render-markdown";

// No typography plugin is installed, so the element defaults live here rather than as a new
// stylesheet — styles/ is meant to stay the only CSS in the project.
const MARKDOWN_STYLES = [
  "text-sm leading-relaxed break-words",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-semibold",
  "[&_p]:my-3",
  "[&_a]:text-info [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1",
  "[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:bg-muted [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:w-full [&_table]:text-left",
  "[&_th]:border-border [&_th]:border-b [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold",
  "[&_td]:border-border [&_td]:border-b [&_td]:px-2 [&_td]:py-1",
  "[&_hr]:border-border [&_hr]:my-6",
  "[&_img]:max-w-full [&_img]:rounded-lg",
].join(" ");

export function MarkdownPreview({ source }: { readonly source: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void renderMarkdown(source).then((rendered) => {
      if (!cancelled) setHtml(rendered);
    });

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (html === null) {
    return <p className="text-muted-foreground text-sm">Rendering Markdown…</p>;
  }

  // Sanitised in renderMarkdown — see the comment there for why that is not optional.
  return <div className={MARKDOWN_STYLES} dangerouslySetInnerHTML={{ __html: html }} />;
}
