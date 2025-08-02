// deno-lint-ignore-file no-explicit-any
import type { ToyDb } from "./ToyDb.ts";

export type Something = Record<string, any>;
export type IdKv<T extends Something> = {
  idName: keyof T;
  idValue: string;
};
export type UpdateInstruction<T extends Something> = Partial<
  {
    [K in keyof T as K extends string ? K : never]: (
      comparator: { fresh?: T[K]; prev?: T[K]; db: ToyDb<string[]> },
    ) => T[K] | Promise<T[K]>;
  }
>;
export type Where<T extends Something> = (
  entity: T,
) => Promise<boolean> | boolean;
