// deno-lint-ignore-file no-explicit-any require-await
import { init_id_generator } from "./init_id_generator.ts";
import type { IdKv, Something, UpdateInstruction, Where } from "./types.ts";

export class ToyDb<Tag extends string[]> {
  public static async init<T extends string[] = string[]>(): Promise<ToyDb<T>> {
    const instance = new ToyDb<T>();

    return instance;
  }
  private constructor(
    public store: any[] = [],
    public idSet: Set<string> = new Set(),
    public genId: () => string = init_id_generator(),
  ) {}

  public async update<T extends Something>(
    data: Partial<T>,
    {
      idName,
      idValue,
    }: IdKv<T>,
    merge_instructions?: UpdateInstruction<T>,
  ): Promise<T | null> {
    // deno-lint-ignore no-this-alias
    const This = this;
    const isPrevExist = this.idSet.has(idValue);
    if (!isPrevExist) {
      return null;
    }
    const prev = await this.removeUnique({ idName, idValue }) as T;
    const extra = merge_instructions &&
      Object.fromEntries(
        await Promise.all(
          Object.entries(merge_instructions).map(async ([k, instruction]) => {
            const _instruction = instruction as UpdateInstruction<
              T
            >[keyof UpdateInstruction<T>];
            const value = await _instruction!({
              db: This,
              fresh: data[k as keyof typeof data],
              prev: prev[k as keyof typeof prev],
            });
            return [k, value];
          }),
        ),
      );
    const fresh = {
      ...prev,
      ...data,
      ...extra,
    };
    this.store.push(fresh);

    return fresh;
  }

  public async findWhere<T extends Something>(
    filter: Where<T> | Where<T>[],
    pagination: {
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<T[]> {
    const res = [] as T[];
    const _filter = Array.isArray(filter) ? filter : [filter];
    const { limit = 10, skip = 0 } = pagination;
    for (
      let i = 0;
      i < this.store.length && limit + skip > res.length;
      ++i
    ) {
      const item = this.store[i];
      let isMatch = true;

      for (let ii = 0; ii < _filter.length; ++ii) {
        isMatch = await _filter[ii](item);

        if (!isMatch) break;
      }

      if (isMatch) {
        res.push(item as T);
      }
    }

    return res.slice(skip);
  }

  public async save<T extends Something, U extends string = Tag[number]>(
    tag: U,
    data: Omit<T, typeof idName>[],
    idName: keyof T,
    options: {
      ttl?: number;
    } = {},
  ): Promise<T[]> {
    const {
      ttl,
    } = options;
    const saves = [] as T[];
    for (let i = 0; i < data.length; ++i) {
      const id = `${tag}_${this.genId()}`;
      this.idSet.add(id);
      saves.push({
        ...data[i],
        [idName]: id,
      } as T);
    }
    this.store.push(...saves);

    if (ttl) {
      setTimeout(() => {
        saves.forEach((s) => {
          this.removeUnique({ idName, idValue: s[idName] });
        });
      }, ttl);
    }

    return saves;
  }

  async removeUnique<T extends Something = Something>(
    {
      idName,
      idValue,
    }: IdKv<T>,
  ): Promise<T | null> {
    if (!this.idSet.has(idValue)) return null;

    const index = this.store.findIndex((item) => item[idName] === idValue);
    const [deleted] = this.store.splice(index, 1);

    return deleted as T;
  }

  async findUnique<T extends Something = Something>({
    idName,
    idValue,
  }: IdKv<T>): Promise<T | null> {
    if (!this.idSet.has(idValue)) return null;

    const result =
      (this.store as T[]).find((item) => item[idName] === idValue) || null;

    return result;
  }
}
