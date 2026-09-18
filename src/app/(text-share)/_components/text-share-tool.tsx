"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TextShareDto } from "@/lib/application/dto/text-share";
import type { UserDto } from "@/lib/application/dto/user";
import type { Retention } from "@/lib/domain/value-objects/retention";
import { useCurrentUrl } from "@/app/(text-share)/_hooks/use-current-url";
import { useHashSync } from "@/app/(text-share)/_hooks/use-hash-sync";
import { useSaveShare } from "@/app/(text-share)/_hooks/use-save-share";
import { useToast } from "@/app/(text-share)/_hooks/use-toast";
import { copyToClipboard } from "@/app/(text-share)/_lib/clipboard";
import { decompress } from "@/app/(text-share)/_lib/codec";
import { replaceUrl } from "@/app/(text-share)/_lib/current-url";
import { resolveFormat, type FormatChoice } from "@/app/(text-share)/_lib/format-choice";
import { formatSource } from "@/app/(text-share)/_lib/format-source";
import { sharePath } from "@/app/(text-share)/_lib/routes";
import { EditorPanel } from "./editor-panel";
import { Panel } from "./panel";
import { PreviewPanel } from "./preview-panel";
import { StatusBar } from "./status-bar";
import { Toast } from "./toast";
import { ToolHeader } from "./tool-header";

const UNREADABLE_LINK =
  "This link could not be read. It may be truncated, or made by a different version of the tool.";

export function TextShareTool({
  initialShare,
  user,
}: {
  readonly initialShare?: TextShareDto;
  readonly user?: UserDto;
}) {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<FormatChoice>(initialShare?.format ?? "AUTO");
  const [loaded, setLoaded] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState(initialShare !== undefined);
  const [retention, setRetention] = useState<Retention>("ONE_MONTH");
  const [savedCode, setSavedCode] = useState<string | null>(initialShare?.code ?? null);

  const toast = useToast();
  const { save, saving } = useSaveShare();
  const url = useCurrentUrl();

  // Decoding is async and the payload may be a hash rather than a saved share, so the initial
  // text cannot come from the server render.
  useEffect(() => {
    let cancelled = false;

    // Even an empty payload goes through `decompress`, so nothing here calls setState
    // synchronously — the cascading-render rule this codebase already learned once.
    void decompress(initialShare?.content ?? window.location.hash.slice(1)).then((decoded) => {
      if (cancelled) return;
      if (decoded === null) setLinkError(UNREADABLE_LINK);
      else if (decoded) setText(decoded);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialShare?.content]);

  // Held off until the incoming link has been decoded, and while an unreadable one is on screen:
  // syncing an empty editor would overwrite the very hash the visitor is trying to open.
  useHashSync(text, loaded && savedCode === null && linkError === null);

  const format = resolveFormat(choice, text);

  const handleTextChange = (next: string) => {
    setLinkError(null);
    setSavedCode(null);
    setText(next);
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(window.location.href);
    toast.show(copied ? "Link copied" : "Could not copy — the link is in the address bar");
  };

  const handleFormat = () => {
    const formatted = formatSource(text, format);
    if (!formatted.ok) {
      toast.show(formatted.error);
      return;
    }
    handleTextChange(formatted.value);
    toast.show("Formatted");
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.show("There is nothing to save");
      return;
    }

    const result = await save({ text, format, retention });

    if ("error" in result) {
      toast.show(result.error);
      return;
    }

    setSavedCode(result.code);
    replaceUrl(sharePath(result.code));

    const copied = await copyToClipboard(window.location.href);
    toast.show(copied ? "Saved — link copied" : "Saved — the link is in the address bar");
  };

  const handleSaveModeChange = (next: boolean) => {
    setSaveMode(next);
    if (!next) setSavedCode(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ToolHeader
        url={url}
        choice={choice}
        onChoiceChange={setChoice}
        onCopy={() => void handleCopy()}
        onFormat={handleFormat}
        saveMode={saveMode}
        onSaveModeChange={handleSaveModeChange}
        retention={retention}
        onRetentionChange={setRetention}
        onSave={() => void handleSave()}
        saving={saving}
        user={user}
      />

      {linkError !== null && (
        <Alert variant="destructive" className="mx-4 mt-3">
          <AlertDescription>{linkError}</AlertDescription>
        </Alert>
      )}

      <main className="divide-border flex min-h-0 flex-1 flex-col divide-y md:flex-row md:divide-x md:divide-y-0">
        <Panel title="Editor">
          <EditorPanel value={text} onChange={handleTextChange} />
        </Panel>
        <PreviewPanel text={text} format={format} />
      </main>

      <StatusBar characters={text.length} urlLength={url.length} />
      <Toast message={toast.message} />
    </div>
  );
}
