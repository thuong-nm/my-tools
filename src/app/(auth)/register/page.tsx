import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { safeNextPath } from "@/app/(auth)/_lib/next-path";
import { MIN_PASSWORD_LENGTH } from "@/lib/domain/value-objects/password";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const next = safeNextPath((await searchParams).next);

  if (await currentUser()) redirect(next);

  return (
    <AuthForm
      title="Create an account"
      description="Short links you save while signed in are kept in your history."
      endpoint="/api/auth/register"
      submitLabel="Create account"
      pendingLabel="Creating…"
      passwordAutoComplete="new-password"
      passwordHint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      next={next}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    />
  );
}
