import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { directionsRequestSchema } from "@trailbase/shared";
import { ValhallaAdapter, calculateElevation } from "../adapters/routing/valhalla-adapter.js";
import { ValhallaElevationAdapter } from "../adapters/elevation/index.js";
import type { ElevationProvider } from "../adapters/elevation/index.js";
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
const elevationAdapter: ElevationProvider = new ValhallaElevationAdapter();

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

    // Enrich coordinates with elevation data
    const coords2D = routeResult.geometry.coordinates as [number, number][];
    const elevations = await elevationAdapter.getElevations(coords2D);

    const hasElevation = elevations.some((e) => e !== null && e !== 0);

    if (hasElevation) {
      // Merge elevation into coordinates as [lng, lat, elev]
      routeResult.geometry.coordinates = coords2D.map(([lng, lat], i) => [
        lng,
        lat,
        elevations[i] ?? 0,
      ]);

      const { gain, loss } = calculateElevation(
        routeResult.geometry.coordinates,
      );
      routeResult.elevationGainM = gain;
      routeResult.elevationLossM = loss;
    }

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
