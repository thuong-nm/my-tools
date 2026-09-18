import type { Metadata } from "next";

import { currentUser } from "@/app/_lib/current-user";
import { TextShareTool } from "@/app/(text-share)/_components/text-share-tool";

export const metadata: Metadata = {
  title: "Text Share",
  description:
    "Share text, JSON, XML, HTML or Markdown as a link — in the URL itself, or as a short link with an expiry.",
};

export default async function TextSharePage() {
  const user = await currentUser();

  return <TextShareTool {...(user ? { user } : {})} />;
}
