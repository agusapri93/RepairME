import { app } from "./app";
import { env } from "./config/env";
import web from "./web/index.html";

// Bun serves the React app (bundled from index.html) and forwards /api to Elysia.
const server = Bun.serve({
  port: env.PORT,
  routes: {
    "/api/*": (req) => app.handle(req),
    "/*": web,
  },
  development: Bun.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

console.log(`Server running at ${server.url}`);
