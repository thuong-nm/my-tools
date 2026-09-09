// Makes passing an OrderId where a UserId is expected a compile error. Type-system only:
// costs nothing at runtime and serializes as a plain string.
//
// One pair per aggregate, in `identifier.ts` next to this file:
//   export type OrderId = Branded<string, "OrderId">;
//   export const asOrderId = (value: string): OrderId => value as OrderId;
//
// `as*` ASSERTS, it does not validate — the brand is a compile-time fiction. Use it only where
// provenance is already known, never as a substitute for validating untrusted input. Minting an
// id is non-deterministic, so it happens in infrastructure, never here (rule 1).
declare const brand: unique symbol;

export type Branded<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};
