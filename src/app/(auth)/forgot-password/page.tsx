import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentUser } from "@/app/_lib/current-user";
import { recaptchaSiteKey } from "@/app/_lib/recaptcha";
import { ForgotPasswordForm } from "@/app/(auth)/_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  if (await currentUser()) redirect("/");

  const siteKey = recaptchaSiteKey();

  return <ForgotPasswordForm {...(siteKey ? { siteKey } : {})} />;
}
