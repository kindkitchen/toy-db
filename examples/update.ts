import { ToyDb } from "../ToyDb.ts";

type Counter = {
  id: string;
  name: string;
  count: number;
};

const db = await ToyDb.init<["counter"]>();

const [counter] = await db.save<Counter>(
  "counter",
  [{ name: "visits", count: 1 }],
  "id",
);

const updated = await db.update<Counter>(
  { count: 2 },
  { idName: "id", idValue: counter.id },
  {
    count: ({ prev = 0, fresh = 0 }) => prev + fresh,
  },
);

console.log(updated);
