"use client";

// `allow-scripts` WITHOUT `allow-same-origin`: the two together would defeat the sandbox
// entirely, letting pasted HTML reach this page's storage and rewrite its own sandbox attribute.
export function HtmlFrame({ source }: { readonly source: string }) {
  return (
    <iframe
      title="Rendered HTML preview"
      sandbox="allow-scripts"
      srcDoc={source}
      className="h-full w-full border-0 bg-white"
    />
  );
}
