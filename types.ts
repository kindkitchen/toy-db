// deno-lint-ignore-file no-explicit-any
import type { ToyDb } from "./ToyDb.ts";

/** Any object-like record that can be stored in ToyDb. */
export type Something = Record<string, any>;

/** Id field name and id value used by unique lookup, update, and removal. */
export type IdKv<T extends Something> = {
  idName: keyof T;
  idValue: string;
};

/**
 * Field-level update hooks.
 *
 * Each hook receives the fresh value, previous value, and db instance, then
 * returns the final value that should be stored for that field.
 */
export type UpdateInstruction<T extends Something> = Partial<
  {
    [K in keyof T as K extends string ? K : never]: (
      comparator: { fresh?: T[K]; prev?: T[K]; db: ToyDb<string[]> },
    ) => T[K] | Promise<T[K]>;
  }
>;

/** Predicate used by `findWhere`. */
export type Where<T extends Something> = (
  entity: T,
) => Promise<boolean> | boolean;
