// deno-lint-ignore-file no-explicit-any require-await
import { init_id_generator } from "./init_id_generator.ts";
import type { IdKv, Something, UpdateInstruction, Where } from "./types.ts";

export class ToyDb<Tag extends string[]> {
  private ttl_timers = new Set<number>();
  public static async init<T extends string[] = string[]>(): Promise<ToyDb<T>> {
    const instance = new ToyDb<T>();

    return instance;
  }
  private constructor(
    public store: any[] = [],
    public idSet: Set<string> = new Set(),
    public genId: () => string = init_id_generator(),
  ) {}

  /**
   * @description
   * Will be good to use invoke this method before finish work with toy db
   * to prevent dangled timers.
   */
  public clean_all_ttl_timers() {
    this.ttl_timers.forEach((id) => clearTimeout(id));
    this.ttl_timers.clear();
  }

  public async update<T extends Something>(
    data: Partial<T>,
    {
      idName,
      idValue,
    }: IdKv<T>,
    merge_instructions?: UpdateInstruction<T>,
  ): Promise<T | null> {
    const isPrevExist = this.idSet.has(idValue);
    if (!isPrevExist) {
      return null;
    }
    const prev = await this.findUnique({ idName, idValue }) as T | null;
    if (!prev) {
      return null;
    }
    const extra = merge_instructions &&
      Object.fromEntries(
        await Promise.all(
          Object.entries(merge_instructions).map(async ([k, instruction]) => {
            const _instruction = instruction as UpdateInstruction<
              T
            >[keyof UpdateInstruction<T>];
            const value = await _instruction!({
              db: this,
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
      [idName]: idValue,
    };
    const index = this.store.findIndex((item) => item[idName] === idValue);
    if (index === -1) {
      return null;
    }
    this.store[index] = fresh;
    this.idSet.add(idValue);

    return fresh as T;
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
      const timeout_id = setTimeout(() => {
        saves.forEach((s) => {
          this.removeUnique({ idName, idValue: s[idName] });
        });
        this.ttl_timers.delete(timeout_id);
      }, ttl);
      this.ttl_timers.add(timeout_id);
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
    if (index === -1) return null;
    const [deleted] = this.store.splice(index, 1);
    this.idSet.delete(idValue);

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
