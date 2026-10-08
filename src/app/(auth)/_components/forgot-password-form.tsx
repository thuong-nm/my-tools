"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/components/use-recaptcha";
import { ApiError, apiPost } from "@/lib/http/client";

export function ForgotPasswordForm({ siteKey }: { readonly siteKey?: string }) {
  const { execute } = useRecaptcha(siteKey);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      await apiPost("/api/auth/forgot-password", {
        email,
        recaptchaToken: await execute("forgot_password"),
      });
      setSent(true);
    } catch (cause) {
      setFormError(
        cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-muted-foreground text-sm">
          We will email you a link to choose a new one.
        </p>
      </div>

      {sent ? (
        // Worded so it says nothing about whether the address has an account: a different
        // message for an unknown address would be an enumeration oracle.
        <Alert>
          <AlertDescription>
            If that address has an account, a reset link is on its way. It works once and expires
            in an hour.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
          {formError !== null && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
