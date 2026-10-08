"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/components/use-recaptcha";
import { ApiError, apiPost } from "@/lib/http/client";
import type { FieldErrors } from "@/lib/http/envelope";

export function ResetPasswordForm({
  token,
  siteKey,
}: {
  readonly token: string;
  readonly siteKey?: string;
}) {
  const router = useRouter();
  const { execute } = useRecaptcha(siteKey);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | undefined>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors(undefined);

    try {
      await apiPost("/api/auth/reset-password", {
        token,
        password,
        recaptchaToken: await execute("reset_password"),
      });
    } catch (cause) {
      // Reset here and not in a `finally`: success navigates away, and `finally` would
      // re-enable the button mid-load.
      setSubmitting(false);
      setFormError(
        cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.",
      );
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors);
      return;
    }

    router.replace("/login?reset=1");
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">
          This link works once. You will sign in with the new password.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
        {formError !== null && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            autoComplete="new-password"
            required
            aria-invalid={fieldErrors?.password?.length ? true : undefined}
            aria-describedby={fieldErrors?.password?.length ? "password-error" : "password-hint"}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors?.password?.length ? (
            <p id="password-error" className="text-destructive text-xs">
              {fieldErrors.password.join(" ")}
            </p>
          ) : (
            <p id="password-hint" className="text-muted-foreground text-xs">
              At least 8 characters.
            </p>
          )}
        </div>

        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/forgot-password" className="text-primary underline underline-offset-4">
          Request a new link
        </Link>
      </p>
    </main>
  );
}
