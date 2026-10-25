import { DrizzleQueryError } from "drizzle-orm";
import { Elysia } from "elysia";
import postgres from "postgres";
import { assetsModule } from "./modules/assets";
import { authModule } from "./modules/auth";
import { buildingsModule } from "./modules/buildings";
import { categoriesModule } from "./modules/categories";
import { dashboardModule } from "./modules/dashboard";
import { healthModule } from "./modules/health";
import { reportsModule } from "./modules/reports";
import { usersModule } from "./modules/users";

const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_UNIQUE_VIOLATION = "23505";

export const app = new Elysia({ prefix: "/api" })
  .onError(({ error, status }) => {
    if (!(error instanceof DrizzleQueryError)) return;

    const cause = error.cause;
    if (cause instanceof postgres.PostgresError) {
      if (cause.code === PG_UNIQUE_VIOLATION) {
        return status(409, { message: "Data sudah ada", detail: cause.detail });
      }
      if (cause.code === PG_FOREIGN_KEY_VIOLATION) {
        return status(409, { message: "Data masih digunakan oleh data lain sehingga tidak dapat dihapus" });
      }
    }

    // Hide SQL and parameters from clients for any other database error.
    console.error(error);
    return status(500, { message: "Terjadi kesalahan pada server" });
  })
  .use(healthModule)
  .use(authModule)
  .use(dashboardModule)
  .use(categoriesModule)
  .use(buildingsModule)
  .use(assetsModule)
  .use(reportsModule)
  .use(usersModule);

export type App = typeof app;
