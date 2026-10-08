"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/components/use-recaptcha";
import { ApiError, apiPost } from "@/lib/http/client";

/**
 * Rendered INSTEAD of the editor, never alongside it: the server refuses to send the payload
 * until the grant exists, so there is nothing here to reveal by reading the page source.
 */
export function UnlockForm({ code, siteKey }: { readonly code: string; readonly siteKey?: string }) {
  const router = useRouter();
  const { execute } = useRecaptcha(siteKey);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiPost(`/api/text-share/${encodeURIComponent(code)}/unlock`, {
        password,
        recaptchaToken: await execute("unlock_share"),
      });
    } catch (cause) {
      setSubmitting(false);
      setError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
      return;
    }

    // The grant is an httpOnly cookie, so only a server render can act on it.
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-muted text-muted-foreground grid size-11 place-content-center rounded-full">
          <Lock className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">This link is protected</h1>
        <p className="text-muted-foreground text-sm">
          Enter the password to open it. This browser stays unlocked for 24 hours.
        </p>
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
        {error !== null && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-password">Password</Label>
          <PasswordInput
            id="share-password"
            value={password}
            visible={visible}
            autoComplete="off"
            onVisibleChange={setVisible}
            onChange={setPassword}
          />
        </div>

        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? "Opening…" : "Open"}
        </Button>
      </form>
    </main>
  );
}

/** Shared with the confirm dialog so the reveal toggle behaves the same in both places. */
export function PasswordInput({
  id,
  value,
  visible,
  placeholder,
  autoComplete,
  onVisibleChange,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly visible: boolean;
  readonly placeholder?: string;
  readonly autoComplete: string;
  readonly onVisibleChange: (next: boolean) => void;
  readonly onChange: (next: string) => void;
}) {
  return (
    <div className="relative flex items-center">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        className="pr-9"
        {...(placeholder === undefined ? {} : { placeholder })}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        // Announced as an action rather than a state, so a screen reader hears what pressing
        // it will do instead of a label that silently flips meaning.
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1"
        onClick={() => onVisibleChange(!visible)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
