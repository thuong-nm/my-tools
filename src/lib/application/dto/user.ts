import type { User } from "@/lib/domain/entities/user";

// Never carries the password hash. This is the HTTP response body the day this goes headless,
// so a field added here is public forever.
export type UserDto = {
  readonly id: string;
  readonly email: string;
};

export function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email };
}
