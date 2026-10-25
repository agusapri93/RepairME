import { and, desc, eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { assetCategories, assets, damageReports, maintenanceRecords, rooms, users } from "../../db/schema";
import { authPlugin } from "../../lib/auth";
import { listAssetsWithSchedule, today } from "../../lib/maintenance";
import { enumOf, patchOf } from "../../lib/schema";
import { ASSET_CONDITIONS } from "../../shared/constants";

const params = t.Object({ id: t.Numeric({ minimum: 1 }) });
const isoDate = t.String({ format: "date" });
// No asset tag here: it is generated on create and can't be changed.
const assetBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  categoryId: t.Integer({ minimum: 1 }),
  roomId: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
  purchaseDate: t.Optional(t.Nullable(isoDate)),
  condition: t.Optional(enumOf(ASSET_CONDITIONS)),
  maintenanceIntervalDays: t.Optional(t.Nullable(t.Integer({ minimum: 1, maximum: 3650 }))),
  notes: t.Optional(t.Nullable(t.String())),
});

async function categoryExists(id: number) {
  const [category] = await db
    .select({ id: assetCategories.id })
    .from(assetCategories)
    .where(eq(assetCategories.id, id));
  return Boolean(category);
}

async function roomExists(id: number) {
  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, id));
  return Boolean(room);
}

export const assetsModule = new Elysia({ prefix: "/assets" })
  .use(authPlugin)
  .get("/", () => listAssetsWithSchedule(), { auth: true })
  .get(
    "/:id",
    async ({ params, user, status }) => {
      const [asset] = await listAssetsWithSchedule(eq(assets.id, params.id));
      if (!asset) return status(404, { message: "Aset tidak ditemukan" });

      const maintenance = await db
        .select({
          id: maintenanceRecords.id,
          performedAt: maintenanceRecords.performedAt,
          description: maintenanceRecords.description,
          performedBy: users.name,
        })
        .from(maintenanceRecords)
        .leftJoin(users, eq(users.id, maintenanceRecords.performedById))
        .where(eq(maintenanceRecords.assetId, params.id))
        .orderBy(desc(maintenanceRecords.performedAt), desc(maintenanceRecords.id));

      const reports = await db
        .select({
          id: damageReports.id,
          title: damageReports.title,
          status: damageReports.status,
          priority: damageReports.priority,
          createdAt: damageReports.createdAt,
        })
        .from(damageReports)
        .where(
          user.role === "pegawai"
            ? and(eq(damageReports.assetId, params.id), eq(damageReports.reporterId, user.id))
            : eq(damageReports.assetId, params.id),
        )
        .orderBy(desc(damageReports.createdAt));

      return { ...asset, maintenance, reports };
    },
    { auth: true, params },
  )
  .post(
    "/",
    async ({ body, status }) => {
      if (body.roomId && !(await roomExists(body.roomId))) return status(400, { message: "Ruangan tidak ditemukan" });
      const asset = await db.transaction(async (tx) => {
        // Bumping the counter row also locks it, so concurrent creates get distinct numbers.
        const [category] = await tx
          .update(assetCategories)
          .set({ lastTagNumber: sql`${assetCategories.lastTagNumber} + 1` })
          .where(eq(assetCategories.id, body.categoryId))
          .returning({ code: assetCategories.code, number: assetCategories.lastTagNumber });
        if (!category) return null;

        const assetTag = `${category.code}-${String(category.number).padStart(4, "0")}`;
        const [created] = await tx
          .insert(assets)
          .values({ ...body, assetTag })
          .returning();
        return created;
      });
      return asset ? status(201, asset) : status(400, { message: "Kategori aset tidak ditemukan" });
    },
    { auth: ["administrator"], body: assetBody },
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      if (body.categoryId && !(await categoryExists(body.categoryId))) {
        return status(400, { message: "Kategori aset tidak ditemukan" });
      }
      if (body.roomId && !(await roomExists(body.roomId))) return status(400, { message: "Ruangan tidak ditemukan" });
      const [asset] = await db.update(assets).set(body).where(eq(assets.id, params.id)).returning();
      return asset ?? status(404, { message: "Aset tidak ditemukan" });
    },
    { auth: ["administrator"], params, body: patchOf(assetBody) },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const [asset] = await db.delete(assets).where(eq(assets.id, params.id)).returning({ id: assets.id });
      return asset ? status(204) : status(404, { message: "Aset tidak ditemukan" });
    },
    { auth: ["administrator"], params },
  )
  .post(
    "/:id/maintenance",
    async ({ params, body, user, status }) => {
      if (body.performedAt > today()) {
        return status(400, { message: "Tanggal pemeliharaan tidak boleh di masa depan" });
      }
      const [asset] = await db.select({ id: assets.id }).from(assets).where(eq(assets.id, params.id));
      if (!asset) return status(404, { message: "Aset tidak ditemukan" });

      const [record] = await db
        .insert(maintenanceRecords)
        .values({ ...body, assetId: params.id, performedById: user.id })
        .returning();
      return status(201, record);
    },
    {
      auth: ["administrator", "teknisi"],
      params,
      body: t.Object({ performedAt: isoDate, description: t.String({ minLength: 1 }) }),
    },
  )
  .delete(
    "/:id/maintenance/:recordId",
    async ({ params, status }) => {
      const [record] = await db
        .delete(maintenanceRecords)
        .where(and(eq(maintenanceRecords.id, params.recordId), eq(maintenanceRecords.assetId, params.id)))
        .returning({ id: maintenanceRecords.id });
      return record ? status(204) : status(404, { message: "Catatan pemeliharaan tidak ditemukan" });
    },
    {
      auth: ["administrator"],
      params: t.Object({ id: t.Numeric({ minimum: 1 }), recordId: t.Numeric({ minimum: 1 }) }),
    },
  );
