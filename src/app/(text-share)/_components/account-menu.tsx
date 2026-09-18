"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { UserDto } from "@/lib/application/dto/user";
import { useSignOut } from "@/app/(text-share)/_hooks/use-sign-out";

export function AccountMenu({ user }: { readonly user?: UserDto }) {
  const { signOut, signingOut } = useSignOut();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/register" />}>
          Register
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" render={<Link href="/history" />}>
        History
      </Button>
      <span
        title={user.email}
        className="text-muted-foreground hidden max-w-40 truncate text-xs sm:inline"
      >
        {user.email}
      </span>
      <Button variant="ghost" size="sm" disabled={signingOut} onClick={() => void signOut()}>
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
