"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TOOL_PATH } from "@/app/(tools)/_lib/routes";
import { apiPost } from "@/lib/http/client";

export function useSignOut(): {
  readonly signingOut: boolean;
  readonly signOut: () => Promise<void>;
} {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // `signingOut` is never reset: both paths below navigate, and re-enabling the button while
  // that is in flight would let a second sign-out through.
  const signOut = async () => {
    setSigningOut(true);

    try {
      await apiPost("/api/auth/logout");
    } catch {
      // The cookie may already be gone or expired, in which case the visitor is signed out
      // either way — showing them the signed-out app tells the truth better than an error.
    }

    router.replace(TOOL_PATH);
    // Who the header shows is decided by a server component, and signing out from "/" is a
    // navigation to the page we are already on — without this, nothing would re-render.
    router.refresh();
  };

  return { signingOut, signOut };
}
