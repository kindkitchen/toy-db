## simple in-memory db for not production purposes

```ts
import { ToyDb } from "./ToyDb.ts"; // TODO: change to jsr import

const db = await ToyDb.init<["demo", "user", "post"]>();
/**
 * @description save() always expect many items
 */
const [user] = await db.save<User>("user", [
  { email: "example@gmail.com" },
], "id");

type User = {
  email: string;
  id: string;
};
```

### TODO: complete documentation
