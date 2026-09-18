import type { Metadata } from "next";

import { currentUser } from "@/app/_lib/current-user";
import { TimestampTool } from "@/app/(tools)/_components/timestamp-tool";

export const metadata: Metadata = {
  title: "Timestamp",
  description: "Convert between Unix epoch, ISO 8601 and local time in the browser.",
};

export default async function TimestampPage() {
  const user = await currentUser();

  return <TimestampTool {...(user ? { user } : {})} />;
}
