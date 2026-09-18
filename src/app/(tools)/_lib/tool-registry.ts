// The tool axis is a routing concept, not a domain one — it deliberately never reaches
// ContentFormat, which is a Postgres enum and would need a migration per tool.
export type ToolId = "share" | "jwt" | "base64" | "timestamp";

export type Tool = {
  readonly id: ToolId;
  readonly path: string;
  readonly name: string;
  readonly summary: string;
};

export const TOOLS: readonly Tool[] = [
  {
    id: "share",
    path: "/",
    name: "Text Share",
    summary: "Share text, JSON, XML, HTML or Markdown as a link",
  },
  { id: "jwt", path: "/jwt", name: "JWT Decoder", summary: "Inspect a token's claims and expiry" },
  {
    id: "base64",
    path: "/base64",
    name: "Base64",
    summary: "Encode and decode Base64, Base64url and percent-encoding",
  },
  {
    id: "timestamp",
    path: "/timestamp",
    name: "Timestamp",
    summary: "Convert between epoch, ISO 8601 and local time",
  },
];

export function toolById(id: ToolId): Tool {
  const tool = TOOLS.find((candidate) => candidate.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);

  return tool;
}
