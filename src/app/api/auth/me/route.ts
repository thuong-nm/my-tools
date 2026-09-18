import { currentUser } from "@/app/_lib/current-user";
import { ok, unauthenticated } from "@/app/api/_lib/responses";

export async function GET() {
  const user = await currentUser();

  return user ? ok({ user }) : unauthenticated();
}
