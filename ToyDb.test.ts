import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.11";
import { ToyDb } from "./ToyDb.ts";

Deno.test("should work", async (suite) => {
  const db = await ToyDb.init<["test"]>();
  await suite.step("save some items", async () => {
    assertEquals(db.store.length, 0, "store should be empty");
    await db.save<{ message: string; id: string }, "message">(
      "message",
      [
        {
          message: "hello world",
        },
      ],
      "id",
    );
    assertEquals(db.store.length, 1, "store should contain 1 item");
    await db.save<{ message: string; id: string }, "message">(
      "message",
      [
        {
          message: "ok, google",
        },
      ],
      "id",
    );
    assertEquals(db.store.length, 2, "store should contain 2 items");
    assertEquals(db.idSet.size, 2, "store should contain 2 unique ids");
    assertNotEquals(
      db.store[0].id,
      db.store[1].id,
      "items should have different ids",
    );
  });

  await suite.step(
    "db.where - filter(s) and pagination should work correctly",
    async () => {
      const prevSize = db.store.length;
      const repeat = 100;
      for (let i = 0; i < repeat; ++i) {
        await db.save<{ i: number; uuid: string }>("test", [{ i }], "uuid");
      }
      assertEquals(
        db.store.length,
        prevSize + repeat,
        "all items should be stored",
      );
      const exampleQuery = async (
        pagination?: Parameters<typeof db.findWhere>[1],
      ) => {
        const actual = await db.findWhere<{ i: number }>([
          ({ i }) => i > 20,
          ({ i }) => i < 30,
        ], pagination);

        return actual;
      };
      assertEquals(
        (await exampleQuery()).length,
        9,
        "there should be 9 items between 20 and 30",
      );
      const skip = 2;
      const limit = 1;
      const paginated = await exampleQuery({ skip, limit });
      assertEquals(
        paginated.length,
        limit,
        `there should be ${limit} items because of limit`,
      );
      assertEquals(paginated.at(0)?.i, 21 + skip, `skip should work properly`);
    },
  );

  await suite.step("get item (unique)", async () => {
    const [saved] = await db.save<{ hello: string; id: string }>("test", [{
      hello: "world",
    }], "id");
    assertEquals(
      saved,
      await db.findUnique({ idName: "id", idValue: saved.id }),
    );
  });

  await suite.step("remove item", async () => {
    const [saved] = await db.save<{ hello: string; id: string }>("test", [{
      hello: "world",
    }], "id");
    assertEquals(
      saved,
      await db.removeUnique({ idName: "id", idValue: saved.id }),
      "removed item should be returned",
    );
    const findAgain = await db.findUnique({
      idName: "id",
      idValue: saved.id,
    });
    assertEquals(findAgain, null, "item should not be found after remove");
  });

  await suite.step("save with ttl", async () => {
    const user = {
      name: "Temporal",
      favorite_colors: [],
    };
    type User = typeof user & { id: string };
    const [saveResult] = await db.save<User, "user">(
      "user",
      [
        user,
      ],
      "id",
      { ttl: 100 },
    );
    const id = saveResult.id;
    const actual_is_present = await db.findUnique<User>({
      idName: "id",
      idValue: id,
    });
    assert(actual_is_present !== null, "The user should be in the db");
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const actual_is_still_present = await db.findUnique<User>({
      idName: "id",
      idValue: id,
    });
    assert(actual_is_still_present !== null, "The user still should be the db");
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const actual_is_not_present = await db.findUnique<User>({
      idName: "id",
      idValue: id,
    });
    assert(actual_is_not_present === null, "The user should be auto-removed");
    await db.save("long_ttl", [{}], "id", {
      ttl: 5000,
    });
    /// without this clean - test will fail
    db.clean_all_ttl_timers();
  });
});
