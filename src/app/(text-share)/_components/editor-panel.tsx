"use client";

export function EditorPanel({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
}) {
  return (
    <textarea
      aria-label="Text to share"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      placeholder="Start typing, or paste JSON, XML, HTML or Markdown…"
      className="text-foreground placeholder:text-muted-foreground h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed focus:outline-none"
    />
  );
}
