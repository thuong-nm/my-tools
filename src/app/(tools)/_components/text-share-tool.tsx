"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRecaptcha } from "@/components/use-recaptcha";
import type { TextShareDto } from "@/lib/application/dto/text-share";
import type { UserDto } from "@/lib/application/dto/user";
import type { Retention } from "@/lib/domain/value-objects/retention";
import { useCurrentUrl } from "@/app/(tools)/_hooks/use-current-url";
import { useHashSync } from "@/app/(tools)/_hooks/use-hash-sync";
import { useSaveShare } from "@/app/(tools)/_hooks/use-save-share";
import { useToast } from "@/app/(tools)/_hooks/use-toast";
import { copyToClipboard } from "@/app/(tools)/_lib/clipboard";
import { decompress } from "@/app/(tools)/_lib/codec";
import { replaceUrl } from "@/app/(tools)/_lib/current-url";
import { resolveFormat, type FormatChoice } from "@/app/(tools)/_lib/format-choice";
import { canFormat, formatSource } from "@/app/(tools)/_lib/format-source";
import { sharePath } from "@/app/(tools)/_lib/routes";
import { AppHeader } from "./app-header";
import { EditorPanel } from "./editor-panel";
import { Panel } from "./panel";
import { PreviewPanel } from "./preview-panel";
import { StatusBar } from "./status-bar";
import { Toast } from "./toast";
import { TextShareActions } from "./tool-header";

const UNREADABLE_LINK =
  "This link could not be read. It may be truncated, or made by a different version of the tool.";

export function TextShareTool({
  initialShare,
  user,
  siteKey,
}: {
  readonly initialShare?: TextShareDto;
  readonly user?: UserDto;
  readonly siteKey?: string;
}) {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<FormatChoice>(initialShare?.format ?? "AUTO");
  const [loaded, setLoaded] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [retention, setRetention] = useState<Retention>("ONE_MONTH");
  const [savedCode, setSavedCode] = useState<string | null>(initialShare?.code ?? null);

  const toast = useToast();
  const { save, saving } = useSaveShare();
  const { execute } = useRecaptcha(siteKey);
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

  const handleChoiceChange = (next: FormatChoice) => {
    setChoice(next);

    const resolved = resolveFormat(next, text);
    if (!text.trim() || !canFormat(resolved)) return;

    const formatted = formatSource(text, resolved);
    if (!formatted.ok) {
      toast.show(formatted.error);
      return;
    }

    // Formatting to the identical string is not an edit. Routing it through handleTextChange
    // would clear savedCode and quietly detach the editor from the share it is displaying.
    if (formatted.value === text) return;

    handleTextChange(formatted.value);
    toast.show("Formatted");
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.show("There is nothing to save");
      return;
    }

    const result = await save({ text, format, retention, recaptchaToken: await execute("save_share") });

    if ("error" in result) {
      toast.show(result.error);
      return;
    }

    setSavedCode(result.code);
    replaceUrl(sharePath(result.code));

    const copied = await copyToClipboard(window.location.href);
    toast.show(copied ? "Saved — link copied" : "Saved — the link is in the address bar");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        tool="share"
        {...(user ? { user } : {})}
        actions={
          <TextShareActions
            url={url}
            choice={choice}
            onChoiceChange={handleChoiceChange}
            onCopy={() => void handleCopy()}
            retention={retention}
            onRetentionChange={setRetention}
            onSave={() => void handleSave()}
            saving={saving}
          />
        }
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
