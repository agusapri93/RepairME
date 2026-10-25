import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db";
import { users } from "../../db/schema";
import { authPlugin, createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "../../lib/auth";

export const authModule = new Elysia({ prefix: "/auth" })
  .use(authPlugin)
  .post(
    "/login",
    async ({ body, cookie, status }) => {
      const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
      const valid = user && (await Bun.password.verify(body.password, user.passwordHash));
      if (!user || !valid) return status(401, { message: "Email atau password salah" });
      if (!user.isActive) return status(403, { message: "Akun Anda sudah dinonaktifkan" });

      cookie[SESSION_COOKIE]!.set({
        value: await createSession(user.id),
        httpOnly: true,
        sameSite: "lax",
        secure: Bun.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post("/logout", async ({ cookie }) => {
    const token = cookie[SESSION_COOKIE]?.value;
    if (typeof token === "string") await deleteSession(token);
    cookie[SESSION_COOKIE]?.remove();
    return { message: "Berhasil logout" };
  })
  .get("/me", ({ user }) => user, { auth: true });
