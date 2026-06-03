## ToyDb

Simple in-memory database for tests, demos, and local experiments.

ToyDb is not persistent and is not intended for production use.

## Install

```ts
import { ToyDb } from "jsr:@nik-kita/toy-db";
```

For local development in this repo:

```ts
import { ToyDb } from "./ToyDb.ts";
```

## Basic Usage

```ts
import { ToyDb } from "jsr:@nik-kita/toy-db";

type User = {
  id: string;
  email: string;
  name: string;
};

const db = await ToyDb.init<["user"]>();

const [user] = await db.save<User>(
  "user",
  [{ email: "example@gmail.com", name: "Ada" }],
  "id",
);

const found = await db.findUnique<User>({
  idName: "id",
  idValue: user.id,
});

console.log(found);
```

`save()` always accepts an array and returns an array. Generated ids are
prefixed with the tag, for example `user_1`.

## API

### `ToyDb.init<Tags>()`

Creates an empty in-memory database.

```ts
const db = await ToyDb.init<["user", "post"]>();
```

The tag tuple provides the default tag type for `save()` when no explicit tag
generic is supplied.

### `save(tag, data, idName, options?)`

Saves many items and assigns an id field to each item.

```ts
const [post] = await db.save<{ id: string; title: string }, "post">(
  "post",
  [{ title: "Hello" }],
  "id",
);
```

Options:

```ts
{
  ttl?: number; // milliseconds before saved items are removed
}
```

### `findUnique({ idName, idValue })`

Finds one item by id or returns `null`.

```ts
const post = await db.findUnique<Post>({
  idName: "id",
  idValue: "post_1",
});
```

### `findWhere(filter, pagination?)`

Finds items that match one filter or all filters in an array.

```ts
const active_users = await db.findWhere<User>(
  [
    (user) => user.active,
    (user) => user.email.endsWith("@example.com"),
  ],
  { skip: 0, limit: 10 },
);
```

Pagination defaults to `{ skip: 0, limit: 10 }`.

### `update(data, id, merge_instructions?)`

Updates an item by id and returns the updated item, or `null` when the item does
not exist.

```ts
const updated = await db.update<User>(
  { name: "Grace" },
  { idName: "id", idValue: user.id },
);
```

Merge instructions can derive values from the previous and fresh values.

```ts
type Counter = {
  id: string;
  count: number;
};

await db.update<Counter>(
  { count: 2 },
  { idName: "id", idValue: counter.id },
  {
    count: ({ prev = 0, fresh = 0 }) => prev + fresh,
  },
);
```

The indexed id stays stable during updates. If `data` contains a different id
value, ToyDb keeps `idValue`.

### `removeUnique({ idName, idValue })`

Removes one item by id and returns the removed item, or `null` when the item
does not exist.

```ts
const removed = await db.removeUnique<User>({
  idName: "id",
  idValue: user.id,
});
```

### `clean_all_ttl_timers()`

Clears pending TTL timers. Use this at the end of tests when you created records
with a long TTL.

```ts
db.clean_all_ttl_timers();
```

## Examples

Run examples from the repo root:

```sh
deno run examples/basic.ts
deno run examples/update.ts
deno run examples/ttl.ts
```

## Development

```sh
deno test
```
