import type { Metadata } from "next";

import { currentUser } from "@/app/_lib/current-user";
import { Base64Tool } from "@/app/(tools)/_components/base64-tool";

export const metadata: Metadata = {
  title: "Base64",
  description: "Encode and decode Base64 and Base64url in the browser.",
};

export default async function Base64Page() {
  const user = await currentUser();

  return <Base64Tool {...(user ? { user } : {})} />;
}
