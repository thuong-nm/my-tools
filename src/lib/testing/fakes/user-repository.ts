import { domainError } from "@/lib/domain/errors/domain-error";
import type { User } from "@/lib/domain/entities/user";
import type { RepositoryError, UserRepository } from "@/lib/domain/ports/repositories";
import type { UserId } from "@/lib/domain/shared/identifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";
import type { Email } from "@/lib/domain/value-objects/email";

export type FakeUserRepository = UserRepository & {
  readonly rows: ReadonlyMap<string, User>;
  failEveryRead(error: RepositoryError): void;
};

export function fakeUserRepository(seed: readonly User[] = []): FakeUserRepository {
  const rows = new Map<string, User>(seed.map((user) => [user.email, user]));
  let readError: RepositoryError | undefined;

  return {
    rows,

    failEveryRead(error: RepositoryError) {
      readError = error;
    },

    async create(user: User): Promise<Result<void, RepositoryError>> {
      if (rows.has(user.email)) {
        return err(domainError("REPOSITORY_CONFLICT", "That email address is already taken."));
      }

      rows.set(user.email, user);
      return ok(undefined);
    },

    async findByEmail(address: Email): Promise<Result<User | undefined, RepositoryError>> {
      if (readError) return err(readError);
      return ok(rows.get(address));
    },

    async findById(id: UserId): Promise<Result<User | undefined, RepositoryError>> {
      if (readError) return err(readError);
      return ok([...rows.values()].find((user) => user.id === id));
    },
  };
}
