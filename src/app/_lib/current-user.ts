import type { UserDto } from "@/lib/application/dto/user";
import { getCurrentUser } from "@/lib/application/use-cases/get-current-user";
import { getContainer } from "@/lib/infrastructure/container";
import { sessionUserId } from "./session";

// A valid signature is not proof the account still exists, so the id is always resolved against
// the database rather than trusted straight off the cookie.
export async function currentUser(): Promise<UserDto | undefined> {
  const userId = await sessionUserId();
  if (!userId) return undefined;

  const { repositories } = getContainer();

  const result = await getCurrentUser({ userId }, { users: repositories.users });

  return result.ok ? result.value : undefined;
}
