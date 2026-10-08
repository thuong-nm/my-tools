"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/application/dto/user";
import { useSignOut } from "@/app/(tools)/_hooks/use-sign-out";
import { HistoryPanel } from "./history-panel";

export function AccountMenu({
  user,
  siteKey,
}: {
  readonly user?: UserDto;
  readonly siteKey?: string;
}) {
  const { signOut, signingOut } = useSignOut();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button variant="outline" render={<Link href="/register" />}>
          Register
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <HistoryPanel {...(siteKey ? { siteKey } : {})} />
      <Initial email={user.email} />
      <Button
        variant="ghost"
        size="icon"
        disabled={signingOut}
        onClick={() => void signOut()}
        aria-label={signingOut ? "Signing out" : "Sign out"}
        title={signingOut ? "Signing out…" : "Sign out"}
      >
        <LogOut />
      </Button>
    </div>
  );
}

// The email is the only identity the account has, and spelling it out cost up to 160px of the
// one header row. The initial keeps it glanceable; the full address stays in the tooltip.
function Initial({ email }: { readonly email: string }) {
  return (
    <span
      title={email}
      className="bg-muted text-muted-foreground grid size-7 shrink-0 place-content-center rounded-full text-xs font-semibold uppercase select-none"
    >
      {email.slice(0, 1)}
    </span>
  );
}
