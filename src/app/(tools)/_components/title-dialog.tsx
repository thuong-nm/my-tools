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
import { PasswordInput } from "./unlock-form";

export type ShareSettings = {
  readonly title?: string;
  readonly hasPassword?: boolean;
};

/**
 * Skippable on purpose: by the time this opens after a save the link already exists and is
 * copied, so everything here is an extra rather than a step to finish.
 */
export function TitleDialog({
  code,
  open,
  initialTitle,
  hasPassword = false,
  siteKey,
  onOpenChange,
  onSaved,
}: {
  readonly code: string;
  readonly open: boolean;
  readonly initialTitle?: string;
  readonly hasPassword?: boolean;
  readonly siteKey?: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: (settings: ShareSettings) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="bg-background border-border fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl transition-[opacity,transform] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {/* Remounted per opening, so the fields always start from the current state. */}
          {open && (
            <SettingsForm
              code={code}
              {...(initialTitle === undefined ? {} : { initialTitle })}
              hasPassword={hasPassword}
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

function SettingsForm({
  code,
  initialTitle,
  hasPassword,
  siteKey,
  onSaved,
  onClose,
}: {
  readonly code: string;
  readonly initialTitle?: string;
  readonly hasPassword: boolean;
  readonly siteKey?: string;
  readonly onSaved: (settings: ShareSettings) => void;
  readonly onClose: () => void;
}) {
  const { execute } = useRecaptcha(siteKey);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // An untouched password field sends nothing. It cannot be pre-filled — the stored value is
    // a hash — so treating empty as "remove" would unlock a link whenever the title was edited.
    const passwordPatch = removePassword ? { password: null } : password ? { password } : {};

    try {
      const { share } = await apiFetch<{ share: ShareSettings }>(
        `/api/text-share/${encodeURIComponent(code)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            ...passwordPatch,
            recaptchaToken: await execute("rename_share"),
          }),
          fallbackMessage: "Could not save.",
        },
      );

      onSaved(share);
      onClose();
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof ApiError ? cause.message : "Could not save.");
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <Dialog.Title className="text-base font-semibold">Confirm</Dialog.Title>

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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-password">Password</Label>
        <PasswordInput
          id="share-password"
          value={removePassword ? "" : password}
          visible={visible}
          autoComplete="new-password"
          placeholder={hasPassword ? "Unchanged" : "No password"}
          onVisibleChange={setVisible}
          onChange={(next) => {
            setRemovePassword(false);
            setPassword(next);
          }}
        />
        <p className="text-muted-foreground text-xs">
          {removePassword
            ? "The password will be removed when you save."
            : hasPassword
              ? "Leave empty to keep the current password."
              : "Anyone opening the link must type it. Leave empty for no password."}
        </p>
        {hasPassword && !removePassword && (
          <button
            type="button"
            className="text-destructive self-start text-xs underline underline-offset-2"
            onClick={() => setRemovePassword(true)}
          >
            Remove password
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Not now
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
