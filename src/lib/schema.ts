import type { TObject } from "@sinclair/typebox";
import { t } from "elysia";

/**
 * `t.UnionEnum` defaults to its first value, so an omitted optional field would be
 * filled in (e.g. a PATCH that only renames a user would also reset their role).
 * Use this instead for every enum in a request schema.
 */
export function enumOf<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values, { default: undefined });
}

/**
 * Body for a PATCH route: every field optional, but at least one known field required.
 * Unknown fields are stripped, and an empty update would make Drizzle throw.
 */
export function patchOf<T extends TObject>(schema: T) {
  return t.Partial(schema, { minProperties: 1 });
}
