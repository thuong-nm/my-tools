import type { Branded } from "./branded";

// `as*` ASSERTS provenance, it does not validate — use it where the value was just minted by
// infrastructure or read back from our own storage, never on untrusted input.
export type TextShareId = Branded<string, "TextShareId">;

export const asTextShareId = (value: string): TextShareId => value as TextShareId;

export type UserId = Branded<string, "UserId">;

export const asUserId = (value: string): UserId => value as UserId;
