// Both libraries are imported lazily: they are only needed once someone previews Markdown, and
// they would otherwise sit in the bundle every visitor downloads.
export async function renderMarkdown(source: string): Promise<string> {
  const [{ marked }, { default: DOMPurify }] = await Promise.all([
    import("marked"),
    import("dompurify"),
  ]);

  const html = await marked.parse(source, { breaks: true, gfm: true });

  // Every preview here is attacker-controlled: the text arrives from a share link, so raw
  // `innerHTML` would make any shared URL an XSS vector.
  return DOMPurify.sanitize(html);
}
