"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/components/use-recaptcha";
import { MAX_SHARE_TITLE_LENGTH } from "@/lib/domain/value-objects/share-title";
import { ApiError, apiFetch } from "@/lib/http/client";

/**
 * Skippable on purpose: by the time this opens the link is already saved and copied, so a title
 * is an extra, never a step the person has to finish.
 */
export function TitleDialog({
  code,
  open,
  initialTitle,
  siteKey,
  onOpenChange,
  onSaved,
}: {
  readonly code: string;
  readonly open: boolean;
  readonly initialTitle?: string;
  readonly siteKey?: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: (title: string | undefined) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="bg-background border-border fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl transition-[opacity,transform] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {/* Remounted per opening, so the field always starts from the current title. */}
          {open && (
            <TitleForm
              code={code}
              {...(initialTitle === undefined ? {} : { initialTitle })}
              {...(siteKey ? { siteKey } : {})}
              onSaved={onSaved}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TitleForm({
  code,
  initialTitle,
  siteKey,
  onSaved,
  onClose,
}: {
  readonly code: string;
  readonly initialTitle?: string;
  readonly siteKey?: string;
  readonly onSaved: (title: string | undefined) => void;
  readonly onClose: () => void;
}) {
  const { execute } = useRecaptcha(siteKey);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { share } = await apiFetch<{ share: { readonly title?: string } }>(
        `/api/text-share/${encodeURIComponent(code)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, recaptchaToken: await execute("rename_share") }),
          fallbackMessage: "Could not save the title.",
        },
      );

      onSaved(share.title);
      onClose();
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof ApiError ? cause.message : "Could not save the title.");
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <Dialog.Title className="text-base font-semibold">Name this link</Dialog.Title>
        <Dialog.Description className="text-muted-foreground text-sm">
          Everyone who opens the link sees this, and it becomes the browser tab&apos;s title.
        </Dialog.Description>
      </div>

      {error !== null && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-title">Title</Label>
        <Input
          id="share-title"
          value={title}
          autoFocus
          maxLength={MAX_SHARE_TITLE_LENGTH}
          placeholder="Release notes, draft 3"
          onChange={(event) => setTitle(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">Leave it empty to remove the title.</p>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Not now
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save title"}
        </Button>
      </div>
    </form>
  );
}
