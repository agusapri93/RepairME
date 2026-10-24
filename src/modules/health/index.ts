import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../../db";

export const healthModule = new Elysia({ prefix: "/health" }).get("/", async ({ status }) => {
  try {
    await db.execute(sql`select 1`);
    return { status: "ok", database: "up" };
  } catch {
    return status(503, { status: "degraded", database: "down" });
  }
});
