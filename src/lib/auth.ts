import { and, eq, gt } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import type { Role } from "../shared/constants";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = { id: number; name: string; email: string; role: Role };

function hashToken(token: string) {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  });
  return token;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function deleteUserSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

async function findSessionUser(token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.isActive, true)),
    );
  return row ?? null;
}

/**
 * Adds the `auth` route option. `auth: true` requires any logged-in user, while
 * `auth: ["administrator", ...]` also restricts the route to those roles.
 * Protected handlers receive the current `user` in their context.
 */
export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: (roles: true | Role[]) => ({
    async resolve({ cookie, status }) {
      const token = cookie[SESSION_COOKIE]?.value;
      const user = typeof token === "string" ? await findSessionUser(token) : null;
      if (!user) return status(401, { message: "Silakan login terlebih dahulu" });
      if (roles !== true && !roles.includes(user.role)) {
        return status(403, { message: "Anda tidak memiliki akses untuk aksi ini" });
      }
      return { user };
    },
  }),
});
