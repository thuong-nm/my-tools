"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/components/use-recaptcha";
import { ApiError, apiPost } from "@/lib/http/client";
import type { FieldErrors } from "@/lib/http/envelope";

export function AuthForm({
  title,
  description,
  endpoint,
  submitLabel,
  pendingLabel,
  passwordAutoComplete,
  passwordHint,
  next,
  footer,
  siteKey,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly endpoint: string;
  readonly submitLabel: string;
  readonly pendingLabel: string;
  readonly passwordAutoComplete: "current-password" | "new-password";
  readonly passwordHint?: string;
  readonly next: string;
  readonly footer: ReactNode;
  readonly siteKey?: string;
  readonly action: "login" | "register";
}) {
  const router = useRouter();
  const { execute } = useRecaptcha(siteKey);
  const [email, setEmail] = useState("");
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
      await apiPost(endpoint, { email, password, recaptchaToken: await execute(action) });
    } catch (cause) {
      // Reset here and not in a `finally`: `finally` also runs on the success path, which is a
      // full-page navigation still in flight, and would re-enable the button mid-load.
      setSubmitting(false);
      setFormError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors);
      return;
    }

    // `refresh` as well as `replace`: the destination re-renders on the server with the cookie
    // that was just set, and `next` may be the page the visitor is already on.
    router.replace(next);
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
        {formError !== null && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          errors={fieldErrors?.email}
        />

        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={passwordAutoComplete}
          hint={passwordHint}
          errors={fieldErrors?.password}
        />

        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? pendingLabel : submitLabel}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">{footer}</p>
    </main>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
  errors,
}: {
  readonly id: string;
  readonly label: string;
  readonly type: "email" | "password";
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly autoComplete: string;
  readonly hint?: string;
  readonly errors?: readonly string[];
}) {
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {errors?.length ? (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {errors.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
