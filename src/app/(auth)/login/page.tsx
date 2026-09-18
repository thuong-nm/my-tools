import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { safeNextPath } from "@/app/(auth)/_lib/next-path";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);

  if (await currentUser()) redirect(next);

  return (
    <AuthForm
      title="Sign in"
      description="Your saved short links live in your account history."
      endpoint="/api/auth/login"
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      passwordAutoComplete="current-password"
      next={next}
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="text-primary underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    />
  );
}
