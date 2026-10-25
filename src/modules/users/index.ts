import { asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { users } from "../../db/schema";
import { authPlugin, deleteUserSessions } from "../../lib/auth";
import { enumOf, patchOf } from "../../lib/schema";
import { ROLES } from "../../shared/constants";

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

const params = t.Object({ id: t.Numeric({ minimum: 1 }) });
const role = enumOf(ROLES);
const userBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  role,
  isActive: t.Optional(t.Boolean()),
});

export const usersModule = new Elysia({ prefix: "/users" })
  .use(authPlugin)
  .guard({ auth: ["administrator"] })
  .get("/", () => db.select(publicColumns).from(users).orderBy(asc(users.name)))
  .post(
    "/",
    async ({ body, status }) => {
      const [user] = await db
        .insert(users)
        .values({
          name: body.name,
          email: body.email.toLowerCase(),
          passwordHash: await Bun.password.hash(body.password),
          role: body.role,
          isActive: body.isActive ?? true,
        })
        .returning(publicColumns);
      return status(201, user);
    },
    { body: userBody },
  )
  .patch(
    "/:id",
    async ({ params, body, user: me, status }) => {
      const changesOwnAccess = (body.role !== undefined && body.role !== me.role) || body.isActive === false;
      if (params.id === me.id && changesOwnAccess) {
        return status(400, { message: "Anda tidak dapat mengubah role atau menonaktifkan akun sendiri" });
      }

      const [before] = await db.select({ role: users.role }).from(users).where(eq(users.id, params.id));
      if (!before) return status(404, { message: "User tidak ditemukan" });

      const { password, email, ...rest } = body;
      const [user] = await db
        .update(users)
        .set({
          ...rest,
          ...(email && { email: email.toLowerCase() }),
          ...(password && { passwordHash: await Bun.password.hash(password) }),
        })
        .where(eq(users.id, params.id))
        .returning(publicColumns);
      if (!user) return status(404, { message: "User tidak ditemukan" });

      // Force a fresh login when access changes, so old sessions can't keep stale rights.
      const roleChanged = body.role !== undefined && body.role !== before.role;
      if (params.id !== me.id && (password || body.isActive === false || roleChanged)) {
        await deleteUserSessions(params.id);
      }
      return user;
    },
    { params, body: patchOf(userBody) },
  )
  .delete(
    "/:id",
    async ({ params, user: me, status }) => {
      if (params.id === me.id) return status(400, { message: "Anda tidak dapat menghapus akun sendiri" });
      const [user] = await db.delete(users).where(eq(users.id, params.id)).returning({ id: users.id });
      return user ? status(204) : status(404, { message: "User tidak ditemukan" });
    },
    { params },
  );
