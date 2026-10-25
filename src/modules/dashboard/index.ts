import { count, desc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../../db";
import { assets, damageReports, maintenanceRecords, users } from "../../db/schema";
import { authPlugin } from "../../lib/auth";
import { daysBetween, listAssetsWithSchedule, today } from "../../lib/maintenance";
import {
  ASSET_CONDITIONS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPORT_STATUSES,
  type AssetCondition,
  type ReportStatus,
} from "../../shared/constants";

function zeroCounts<K extends string>(keys: readonly K[]) {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export const dashboardModule = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user }) => {
      const ownReportsOnly = user.role === "pegawai" ? eq(damageReports.reporterId, user.id) : undefined;
      const now = today();

      const assetList = await listAssetsWithSchedule();
      const byCondition = zeroCounts<AssetCondition>(ASSET_CONDITIONS);
      for (const asset of assetList) byCondition[asset.condition]++;

      const schedule = assetList
        .filter((a) => a.nextMaintenanceAt)
        .map((a) => ({
          id: a.id,
          assetTag: a.assetTag,
          name: a.name,
          nextMaintenanceAt: a.nextMaintenanceAt!,
          daysLeft: daysBetween(now, a.nextMaintenanceAt!),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);

      const recentMaintenance = await db
        .select({
          id: maintenanceRecords.id,
          performedAt: maintenanceRecords.performedAt,
          description: maintenanceRecords.description,
          asset: { id: assets.id, assetTag: assets.assetTag, name: assets.name },
          performedBy: users.name,
        })
        .from(maintenanceRecords)
        .innerJoin(assets, eq(assets.id, maintenanceRecords.assetId))
        .leftJoin(users, eq(users.id, maintenanceRecords.performedById))
        .orderBy(desc(maintenanceRecords.performedAt), desc(maintenanceRecords.id))
        .limit(5);

      const reportCounts = await db
        .select({ status: damageReports.status, total: count() })
        .from(damageReports)
        .where(ownReportsOnly)
        .groupBy(damageReports.status);
      const byStatus = zeroCounts<ReportStatus>(REPORT_STATUSES);
      for (const row of reportCounts) byStatus[row.status] = row.total;

      const recentReports = await db
        .select({
          id: damageReports.id,
          title: damageReports.title,
          status: damageReports.status,
          priority: damageReports.priority,
          createdAt: damageReports.createdAt,
          asset: { id: assets.id, assetTag: assets.assetTag, name: assets.name },
        })
        .from(damageReports)
        .innerJoin(assets, eq(assets.id, damageReports.assetId))
        .where(ownReportsOnly)
        .orderBy(desc(damageReports.createdAt))
        .limit(5);

      return {
        assets: { total: assetList.length, byCondition },
        maintenance: {
          scheduled: schedule.length,
          overdue: schedule.filter((s) => s.daysLeft < 0).length,
          dueSoon: schedule.filter((s) => s.daysLeft >= 0 && s.daysLeft <= MAINTENANCE_DUE_SOON_DAYS).length,
          upcoming: schedule.slice(0, 8),
          recent: recentMaintenance,
        },
        reports: { byStatus, recent: recentReports },
      };
    },
    { auth: true },
  );
