import type { Metadata } from "next";

import { currentUser } from "@/app/_lib/current-user";
import { JwtTool } from "@/app/(tools)/_components/jwt-tool";

export const metadata: Metadata = {
  title: "JWT Decoder",
  description: "Decode a JSON Web Token and read its header, claims and expiry in the browser.",
};

export default async function JwtPage() {
  const user = await currentUser();

  return <JwtTool {...(user ? { user } : {})} />;
}
