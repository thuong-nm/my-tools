import { endSession } from "@/app/_lib/session";
import { ok } from "@/app/api/_lib/responses";

// POST, not GET: a signing-out link would be followed by any prefetcher or image proxy that
// happened to see it.
export async function POST() {
  await endSession();
  return ok({ signedOut: true });
}
