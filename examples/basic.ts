import { ToyDb } from "../ToyDb.ts";

type User = {
  id: string;
  email: string;
  active: boolean;
};

const db = await ToyDb.init<["user"]>();

const [user] = await db.save<User>(
  "user",
  [{ email: "ada@example.com", active: true }],
  "id",
);

const found = await db.findUnique<User>({
  idName: "id",
  idValue: user.id,
});

const active_users = await db.findWhere<User>((item) => item.active);

console.log({ found, active_users });
