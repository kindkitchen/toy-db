import { assertEquals, assertRejects } from "@std/assert";
import { ToyDb } from "./ToyDb.ts";

Deno.test("update preserves the previous item when a merge instruction fails", async () => {
  const db = await ToyDb.init<["user"]>();
  const [saved] = await db.save<{ id: string; count: number }>(
    "user",
    [{ count: 1 }],
    "id",
  );

  await assertRejects(
    () =>
      db.update<{ id: string; count: number }>(
        { count: 2 },
        { idName: "id", idValue: saved.id },
        {
          count: () => {
            throw new Error("merge failed");
          },
        },
      ),
    Error,
    "merge failed",
  );

  assertEquals(
    await db.findUnique({ idName: "id", idValue: saved.id }),
    saved,
  );
  assertEquals(db.idSet.has(saved.id), true);
  assertEquals(db.store.length, 1);
});

Deno.test("update keeps the indexed id stable", async () => {
  const db = await ToyDb.init<["user"]>();
  const [saved] = await db.save<{ id: string; name: string }>(
    "user",
    [{ name: "before" }],
    "id",
  );

  const updated = await db.update<{ id: string; name: string }>(
    { id: "manual_id", name: "after" },
    { idName: "id", idValue: saved.id },
  );

  assertEquals(updated, { id: saved.id, name: "after" });
  assertEquals(
    await db.findUnique({ idName: "id", idValue: saved.id }),
    updated,
  );
  assertEquals(
    await db.findUnique({ idName: "id", idValue: "manual_id" }),
    null,
  );
  assertEquals(
    await db.removeUnique({ idName: "id", idValue: saved.id }),
    updated,
  );
  assertEquals(db.idSet.has(saved.id), false);
});
