export function StatusBar({
  characters,
  urlLength,
}: {
  readonly characters: number;
  readonly urlLength: number;
}) {
  const ratio = characters > 0 ? Math.round((urlLength / characters) * 100) : null;

  return (
    <footer className="border-border text-muted-foreground flex shrink-0 items-center gap-4 border-t px-4 py-2 font-mono text-xs">
      <span>{characters.toLocaleString()} chars</span>
      <span>
        {urlLength > 0
          ? `URL: ${urlLength.toLocaleString()}${ratio === null ? "" : ` (${ratio}%)`}`
          : "URL: —"}
      </span>
    </footer>
  );
}
