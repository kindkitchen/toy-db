import { ToyDb } from "../ToyDb.ts";

type Session = {
  id: string;
  user_id: string;
};

const db = await ToyDb.init<["session"]>();

const [session] = await db.save<Session>(
  "session",
  [{ user_id: "user_1" }],
  "id",
  { ttl: 50 },
);

console.log(
  await db.findUnique<Session>({
    idName: "id",
    idValue: session.id,
  }),
);

await new Promise((resolve) => setTimeout(resolve, 75));

console.log(
  await db.findUnique<Session>({
    idName: "id",
    idValue: session.id,
  }),
);
