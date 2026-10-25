import { and, desc, eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { assets, damageReports, users } from "../../db/schema";
import { authPlugin, type SessionUser } from "../../lib/auth";
import { enumOf, patchOf } from "../../lib/schema";
import { ASSET_CONDITIONS, REPORT_PRIORITIES, REPORT_STATUSES } from "../../shared/constants";

const reporter = alias(users, "reporter");
const handler = alias(users, "handler");

const params = t.Object({ id: t.Numeric({ minimum: 1 }) });
const reportBody = t.Object({
  assetId: t.Integer({ minimum: 1 }),
  title: t.String({ minLength: 1, maxLength: 255 }),
  description: t.String({ minLength: 1 }),
  priority: t.Optional(enumOf(REPORT_PRIORITIES)),
});

/** Pegawai only ever see the reports they filed themselves. */
function visibleTo(user: SessionUser, ...conditions: (SQL | undefined)[]) {
  return and(user.role === "pegawai" ? eq(damageReports.reporterId, user.id) : undefined, ...conditions);
}

function selectReports() {
  return db
    .select({
      id: damageReports.id,
      title: damageReports.title,
      description: damageReports.description,
      priority: damageReports.priority,
      status: damageReports.status,
      followUpNotes: damageReports.followUpNotes,
      resolvedAt: damageReports.resolvedAt,
      createdAt: damageReports.createdAt,
      updatedAt: damageReports.updatedAt,
      asset: { id: assets.id, assetTag: assets.assetTag, name: assets.name, condition: assets.condition },
      reporter: { id: reporter.id, name: reporter.name },
      handler: { id: handler.id, name: handler.name },
    })
    .from(damageReports)
    .innerJoin(assets, eq(assets.id, damageReports.assetId))
    .innerJoin(reporter, eq(reporter.id, damageReports.reporterId))
    .leftJoin(handler, eq(handler.id, damageReports.handledById));
}

async function assetExists(id: number) {
  const [asset] = await db.select({ id: assets.id }).from(assets).where(eq(assets.id, id));
  return Boolean(asset);
}

export const reportsModule = new Elysia({ prefix: "/reports" })
  .use(authPlugin)
  .get(
    "/",
    ({ user, query }) =>
      selectReports()
        .where(visibleTo(user, query.status ? eq(damageReports.status, query.status) : undefined))
        .orderBy(desc(damageReports.createdAt)),
    { auth: true, query: t.Object({ status: t.Optional(enumOf(REPORT_STATUSES)) }) },
  )
  .get(
    "/:id",
    async ({ params, user, status }) => {
      const [report] = await selectReports().where(visibleTo(user, eq(damageReports.id, params.id)));
      return report ?? status(404, { message: "Laporan tidak ditemukan" });
    },
    { auth: true, params },
  )
  .post(
    "/",
    async ({ body, user, status }) => {
      if (!(await assetExists(body.assetId))) return status(400, { message: "Aset tidak ditemukan" });
      const [report] = await db
        .insert(damageReports)
        .values({ ...body, reporterId: user.id })
        .returning();
      return status(201, report);
    },
    { auth: true, body: reportBody },
  )
  .patch(
    "/:id/follow-up",
    async ({ params, body, user, status }) => {
      const resolved = body.status === "selesai" || body.status === "ditolak";
      const report = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(damageReports)
          .set({
            status: body.status,
            followUpNotes: body.followUpNotes,
            handledById: user.id,
            resolvedAt: resolved ? new Date() : null,
          })
          .where(eq(damageReports.id, params.id))
          .returning();
        if (updated && body.assetCondition) {
          await tx.update(assets).set({ condition: body.assetCondition }).where(eq(assets.id, updated.assetId));
        }
        return updated;
      });
      return report ?? status(404, { message: "Laporan tidak ditemukan" });
    },
    {
      auth: ["administrator", "teknisi"],
      params,
      body: t.Object({
        status: enumOf(REPORT_STATUSES),
        followUpNotes: t.Optional(t.Nullable(t.String())),
        assetCondition: t.Optional(enumOf(ASSET_CONDITIONS)),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      if (body.assetId && !(await assetExists(body.assetId))) {
        return status(400, { message: "Aset tidak ditemukan" });
      }
      const [report] = await db
        .update(damageReports)
        .set(body)
        .where(eq(damageReports.id, params.id))
        .returning();
      return report ?? status(404, { message: "Laporan tidak ditemukan" });
    },
    { auth: ["administrator"], params, body: patchOf(reportBody) },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const [report] = await db
        .delete(damageReports)
        .where(eq(damageReports.id, params.id))
        .returning({ id: damageReports.id });
      return report ? status(204) : status(404, { message: "Laporan tidak ditemukan" });
    },
    { auth: ["administrator"], params },
  );
