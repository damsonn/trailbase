import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { directionsRequestSchema } from "@trailbase/shared";
import { ValhallaAdapter } from "../adapters/routing/valhalla-adapter.js";
import type { ApiErrorResponse } from "@trailbase/shared";

type AuthEnv = {
  Variables: {
    user: { id: string; name: string; email: string };
    session: unknown;
  };
};

const routingRoutes = new Hono<AuthEnv>();

routingRoutes.use("*", requireAuth);

const routingAdapter = new ValhallaAdapter();

// ── POST /api/routing/directions ────────────────────────────────────────────

routingRoutes.post("/directions", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } } satisfies ApiErrorResponse,
      400,
    );
  }

  const result = directionsRequestSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid directions request",
          details: result.error.flatten(),
        },
      } satisfies ApiErrorResponse,
      400,
    );
  }

  const { waypoints, profile, options } = result.data;

  try {
    const routeResult = await routingAdapter.getRoute({
      waypoints,
      profile,
      options,
    });

    return c.json({ data: routeResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Routing failed";
    return c.json(
      {
        error: {
          code: "ROUTING_ERROR",
          message,
        },
      } satisfies ApiErrorResponse,
      502,
    );
  }
});

export { routingRoutes };
