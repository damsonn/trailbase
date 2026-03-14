import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { routeRoutes } from "./routes/routes.js";

export const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.get("/api/health", (c) => {
  return c.json({ data: { status: "ok" } });
});

// Mount Better-Auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Mount route CRUD
app.route("/api/routes", routeRoutes);
