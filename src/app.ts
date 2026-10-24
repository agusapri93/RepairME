import { DrizzleQueryError } from "drizzle-orm";
import { Elysia } from "elysia";
import postgres from "postgres";
import { customersModule } from "./modules/customers";
import { healthModule } from "./modules/health";

const PG_UNIQUE_VIOLATION = "23505";

export const app = new Elysia()
  .onError(({ error, status }) => {
    if (!(error instanceof DrizzleQueryError)) return;

    const cause = error.cause;
    if (cause instanceof postgres.PostgresError && cause.code === PG_UNIQUE_VIOLATION) {
      return status(409, { message: "Resource already exists", detail: cause.detail });
    }

    // Hide SQL and parameters from clients for any other database error.
    console.error(error);
    return status(500, { message: "Internal server error" });
  })
  .use(healthModule)
  .use(customersModule);
