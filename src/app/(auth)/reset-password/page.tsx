import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { recaptchaSiteKey } from "@/app/_lib/recaptcha";
import { ResetPasswordForm } from "@/app/(auth)/_components/reset-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  if (await currentUser()) redirect("/");

  const raw = (await searchParams).token;
  // A repeated ?token= is a malformed link, not a choice between two: refuse rather than guess.
  const token = typeof raw === "string" ? raw : "";

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
        <Alert variant="destructive">
          <AlertDescription>
            That reset link is incomplete. Request a new one and open it straight from the email.
          </AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/forgot-password" className="text-primary underline underline-offset-4">
            Request a new link
          </Link>
        </p>
      </main>
    );
  }

  const siteKey = recaptchaSiteKey();

  return <ResetPasswordForm token={token} {...(siteKey ? { siteKey } : {})} />;
}
