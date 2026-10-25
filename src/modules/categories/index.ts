import { asc, count, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { assetCategories, assets } from "../../db/schema";
import { authPlugin } from "../../lib/auth";
import { patchOf } from "../../lib/schema";

const params = t.Object({ id: t.Numeric({ minimum: 1 }) });
const categoryBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 128 }),
  code: t.String({ pattern: "^[A-Za-z0-9]{2,10}$" }),
  description: t.Optional(t.Nullable(t.String())),
});

const columns = {
  id: assetCategories.id,
  name: assetCategories.name,
  code: assetCategories.code,
  description: assetCategories.description,
  lastTagNumber: assetCategories.lastTagNumber,
  createdAt: assetCategories.createdAt,
};

export const categoriesModule = new Elysia({ prefix: "/categories" })
  .use(authPlugin)
  // Every role can read categories (they label assets); only administrators manage them.
  .get(
    "/",
    () =>
      db
        .select({ ...columns, assetCount: count(assets.id) })
        .from(assetCategories)
        .leftJoin(assets, eq(assets.categoryId, assetCategories.id))
        .groupBy(assetCategories.id)
        .orderBy(asc(assetCategories.name)),
    { auth: true },
  )
  .post(
    "/",
    async ({ body, status }) => {
      const [category] = await db
        .insert(assetCategories)
        .values({ ...body, name: body.name.trim(), code: body.code.toUpperCase() })
        .returning(columns);
      return status(201, category);
    },
    { auth: ["administrator"], body: categoryBody },
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      // Once a code appears in asset tags it is locked: otherwise another category could
      // take the old code and generate tags that collide with the existing ones.
      if (body.code) {
        const [current] = await db
          .select({ code: assetCategories.code, assetCount: count(assets.id) })
          .from(assetCategories)
          .leftJoin(assets, eq(assets.categoryId, assetCategories.id))
          .where(eq(assetCategories.id, params.id))
          .groupBy(assetCategories.id);
        if (!current) return status(404, { message: "Kategori aset tidak ditemukan" });
        if (current.assetCount > 0 && current.code !== body.code.toUpperCase()) {
          return status(400, { message: "Kode kategori yang sudah dipakai aset tidak dapat diubah" });
        }
      }

      const [category] = await db
        .update(assetCategories)
        .set({
          ...body,
          ...(body.name && { name: body.name.trim() }),
          ...(body.code && { code: body.code.toUpperCase() }),
        })
        .where(eq(assetCategories.id, params.id))
        .returning(columns);
      return category ?? status(404, { message: "Kategori aset tidak ditemukan" });
    },
    { auth: ["administrator"], params, body: patchOf(categoryBody) },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const [category] = await db
        .delete(assetCategories)
        .where(eq(assetCategories.id, params.id))
        .returning({ id: assetCategories.id });
      return category ? status(204) : status(404, { message: "Kategori aset tidak ditemukan" });
    },
    { auth: ["administrator"], params },
  );
