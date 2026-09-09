// For payloads whose shape is expected to change — a submitted form, an outbound event. The
// domain never branches on their contents: once a rule needs one answer, promote it to a real
// field. `JsonValue` not `any`, so a Date or class instance cannot slip past JSON.stringify.

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type JsonArray = readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    // Excludes Date, Map and class instances, which no JSON round trip survives.
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
