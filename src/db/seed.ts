import { eq } from "drizzle-orm";
import { client, db } from ".";
import { users } from "./schema";

// Creates the first administrator so someone can log in and manage everything else.
const email = (Bun.env.SEED_ADMIN_EMAIL ?? "admin@repairme.local").toLowerCase();
const password = Bun.env.SEED_ADMIN_PASSWORD ?? "admin12345";

const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "administrator")).limit(1);

if (admin) {
  console.log("An administrator already exists, nothing to seed.");
} else {
  await db.insert(users).values({
    name: "Administrator",
    email,
    passwordHash: await Bun.password.hash(password),
    role: "administrator",
  });
  console.log(`Created administrator ${email}. Change its password after the first login.`);
}

await client.end();
