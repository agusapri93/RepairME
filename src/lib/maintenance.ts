import { desc, eq, max, type SQL } from "drizzle-orm";
import { db } from "../db";
import { assetCategories, assets, buildings, maintenanceRecords, rooms } from "../db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date as YYYY-MM-DD, matching how Postgres `date` columns are returned. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  return new Date(Date.parse(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/**
 * Lists assets with their last maintenance date and the next due date derived from
 * `maintenanceIntervalDays`. When an asset has never been maintained, the schedule
 * starts from its purchase date, falling back to when it was registered.
 */
export async function listAssetsWithSchedule(where?: SQL) {
  const rows = await db
    .select({
      asset: assets,
      category: { id: assetCategories.id, name: assetCategories.name, code: assetCategories.code },
      location: {
        roomId: rooms.id,
        roomName: rooms.name,
        floor: rooms.floor,
        buildingId: buildings.id,
        buildingName: buildings.name,
      },
      lastMaintenanceAt: max(maintenanceRecords.performedAt),
    })
    .from(assets)
    .innerJoin(assetCategories, eq(assetCategories.id, assets.categoryId))
    .leftJoin(rooms, eq(rooms.id, assets.roomId))
    .leftJoin(buildings, eq(buildings.id, rooms.buildingId))
    .leftJoin(maintenanceRecords, eq(maintenanceRecords.assetId, assets.id))
    .where(where)
    .groupBy(assets.id, assetCategories.id, rooms.id, buildings.id)
    .orderBy(desc(assets.createdAt));

  return rows.map(({ asset, category, location, lastMaintenanceAt }) => {
    const base = lastMaintenanceAt ?? asset.purchaseDate ?? asset.createdAt.toISOString().slice(0, 10);
    const nextMaintenanceAt =
      asset.maintenanceIntervalDays == null ? null : addDays(base, asset.maintenanceIntervalDays);
    // With GROUP BY, Drizzle returns the left-joined object with all-null fields instead of null.
    const placed =
      location.roomId !== null && location.roomName !== null && location.buildingId !== null && location.buildingName !== null
        ? { ...location, roomId: location.roomId, roomName: location.roomName, buildingId: location.buildingId, buildingName: location.buildingName }
        : null;
    return { ...asset, category, location: placed, lastMaintenanceAt, nextMaintenanceAt };
  });
}
