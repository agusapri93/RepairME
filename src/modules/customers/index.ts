import { desc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../../db";
import { customers } from "../../db/schema";
import { createCustomerBody, customerParams, updateCustomerBody } from "./model";

export const customersModule = new Elysia({ prefix: "/customers" })
  .get("/", () => db.select().from(customers).orderBy(desc(customers.createdAt)))
  .get(
    "/:id",
    async ({ params, status }) => {
      const [customer] = await db.select().from(customers).where(eq(customers.id, params.id));
      return customer ?? status(404, { message: "Customer not found" });
    },
    { params: customerParams },
  )
  .post(
    "/",
    async ({ body, status }) => {
      const [customer] = await db.insert(customers).values(body).returning();
      return status(201, customer);
    },
    { body: createCustomerBody },
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      const [customer] = await db
        .update(customers)
        .set(body)
        .where(eq(customers.id, params.id))
        .returning();
      return customer ?? status(404, { message: "Customer not found" });
    },
    { params: customerParams, body: updateCustomerBody },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const [customer] = await db
        .delete(customers)
        .where(eq(customers.id, params.id))
        .returning({ id: customers.id });
      return customer ? status(204) : status(404, { message: "Customer not found" });
    },
    { params: customerParams },
  );
