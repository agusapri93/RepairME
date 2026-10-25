import { and, asc, count, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { assets, buildings, rooms } from "../../db/schema";
import { authPlugin } from "../../lib/auth";
import { patchOf } from "../../lib/schema";

const params = t.Object({ id: t.Numeric({ minimum: 1 }) });
const roomParams = t.Object({ id: t.Numeric({ minimum: 1 }), roomId: t.Numeric({ minimum: 1 }) });

const buildingBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  address: t.Optional(t.Nullable(t.String())),
  phone: t.Optional(t.Nullable(t.String({ maxLength: 32, pattern: "^[0-9+()\\-\\s]*$" }))),
  managerName: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
});

const roomBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 128 }),
  floor: t.Optional(t.Nullable(t.String({ maxLength: 32 }))),
});

/** Every building with its rooms and how many assets sit in each room. */
async function listBuildings(buildingId?: number) {
  const buildingRows = await db
    .select()
    .from(buildings)
    .where(buildingId ? eq(buildings.id, buildingId) : undefined)
    .orderBy(asc(buildings.name));

  const roomRows = await db
    .select({
      id: rooms.id,
      buildingId: rooms.buildingId,
      name: rooms.name,
      floor: rooms.floor,
      assetCount: count(assets.id),
    })
    .from(rooms)
    .leftJoin(assets, eq(assets.roomId, rooms.id))
    .where(buildingId ? eq(rooms.buildingId, buildingId) : undefined)
    .groupBy(rooms.id)
    .orderBy(asc(rooms.floor), asc(rooms.name));

  return buildingRows.map((b) => {
    const own = roomRows.filter((r) => r.buildingId === b.id);
    return { ...b, rooms: own, assetCount: own.reduce((sum, r) => sum + r.assetCount, 0) };
  });
}

async function buildingExists(id: number) {
  const [row] = await db.select({ id: buildings.id }).from(buildings).where(eq(buildings.id, id));
  return Boolean(row);
}

export const buildingsModule = new Elysia({ prefix: "/buildings" })
  .use(authPlugin)
  // Every role can read buildings and rooms (they describe asset locations); only administrators manage them.
  .get("/", () => listBuildings(), { auth: true })
  .get(
    "/:id",
    async ({ params, status }) => {
      const [building] = await listBuildings(params.id);
      return building ?? status(404, { message: "Gedung tidak ditemukan" });
    },
    { auth: true, params },
  )
  .post(
    "/",
    async ({ body, status }) => {
      const [building] = await db
        .insert(buildings)
        .values({ ...body, name: body.name.trim() })
        .returning();
      return status(201, building);
    },
    { auth: ["administrator"], body: buildingBody },
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      const [building] = await db
        .update(buildings)
        .set({ ...body, ...(body.name && { name: body.name.trim() }) })
        .where(eq(buildings.id, params.id))
        .returning();
      return building ?? status(404, { message: "Gedung tidak ditemukan" });
    },
    { auth: ["administrator"], params, body: patchOf(buildingBody) },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      // Rooms are removed with the building; a room still holding assets blocks this (409).
      const [building] = await db.delete(buildings).where(eq(buildings.id, params.id)).returning({ id: buildings.id });
      return building ? status(204) : status(404, { message: "Gedung tidak ditemukan" });
    },
    { auth: ["administrator"], params },
  )
  .post(
    "/:id/rooms",
    async ({ params, body, status }) => {
      if (!(await buildingExists(params.id))) return status(404, { message: "Gedung tidak ditemukan" });
      const [room] = await db
        .insert(rooms)
        .values({ ...body, name: body.name.trim(), buildingId: params.id })
        .returning();
      return status(201, room);
    },
    { auth: ["administrator"], params, body: roomBody },
  )
  .patch(
    "/:id/rooms/:roomId",
    async ({ params, body, status }) => {
      const [room] = await db
        .update(rooms)
        .set({ ...body, ...(body.name && { name: body.name.trim() }) })
        .where(and(eq(rooms.id, params.roomId), eq(rooms.buildingId, params.id)))
        .returning();
      return room ?? status(404, { message: "Ruangan tidak ditemukan" });
    },
    { auth: ["administrator"], params: roomParams, body: patchOf(roomBody) },
  )
  .delete(
    "/:id/rooms/:roomId",
    async ({ params, status }) => {
      const [room] = await db
        .delete(rooms)
        .where(and(eq(rooms.id, params.roomId), eq(rooms.buildingId, params.id)))
        .returning({ id: rooms.id });
      return room ? status(204) : status(404, { message: "Ruangan tidak ditemukan" });
    },
    { auth: ["administrator"], params: roomParams },
  );
