import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { RouteRepository, type RouteRow, type WaypointRow } from "../repositories/routes.js";
import {
  createRouteSchema,
  updateRouteSchema,
  routeListQuerySchema,
  updateWaypointsSchema,
  activityTypeSchema,
  parseGpx,
  gpxToRouteInput,
  routeToGpx,
  serializeGpx,
  elevationStats,
} from "@trailbase/shared";
import type { ApiErrorResponse } from "@trailbase/shared";
import { ValhallaElevationAdapter } from "../adapters/elevation/index.js";

type AuthEnv = {
  Variables: {
    user: { id: string; name: string; email: string };
    session: unknown;
  };
};

const routeRoutes = new Hono<AuthEnv>();

routeRoutes.use("*", requireAuth);

const repo = new RouteRepository();

// ── Helpers ──────────────────────────────────────────────────────────────────

function validationError(message: string, details?: unknown): ApiErrorResponse {
  return { error: { code: "VALIDATION_ERROR", message, details } };
}

function formatRoute(row: RouteRow) {
  const { geometryJson, ...rest } = row;
  return {
    ...rest,
    geometry: geometryJson ? JSON.parse(geometryJson) : null,
    distanceM: row.distanceM != null ? Number(row.distanceM) : null,
    elevationGainM: row.elevationGainM != null ? Number(row.elevationGainM) : null,
    elevationLossM: row.elevationLossM != null ? Number(row.elevationLossM) : null,
  };
}

function formatWaypoint(row: WaypointRow) {
  return {
    id: row.id,
    routeId: row.routeId,
    position: { lat: Number(row.lat), lng: Number(row.lng) },
    elevationM: row.elevationM != null ? Number(row.elevationM) : null,
    sortOrder: row.sortOrder,
    name: row.name,
    type: row.type,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── GET /api/routes ──────────────────────────────────────────────────────────

routeRoutes.get("/", async (c) => {
  const user = c.get("user");
  const queryResult = routeListQuerySchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(validationError("Invalid query parameters", queryResult.error.flatten()), 400);
  }

  const query = queryResult.data;
  const { rows, total } = await repo.findMany(user.id, query);

  return c.json({
    data: rows.map(formatRoute),
    meta: { page: query.page, perPage: query.perPage, total },
  });
});

// ── POST /api/routes ─────────────────────────────────────────────────────────

routeRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(validationError("Invalid JSON body"), 400);
  }

  const result = createRouteSchema.safeParse(body);
  if (!result.success) {
    return c.json(validationError("Invalid route data", result.error.flatten()), 400);
  }

  const input = result.data;
  const route = await repo.create(user.id, input);
  await repo.createWaypoints(route.id, input.waypoints);

  return c.json({ data: formatRoute(route) }, 201);
});

// ── GET /api/routes/:id ──────────────────────────────────────────────────────

routeRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const route = await repo.findById(id, user.id);
  if (!route) {
    return c.json(
      { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
      404,
    );
  }

  const { waypoints: wps, ...routeData } = route;
  return c.json({
    data: {
      ...formatRoute(routeData),
      waypoints: wps.map(formatWaypoint),
    },
  });
});

// ── PUT /api/routes/:id ──────────────────────────────────────────────────────

routeRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(validationError("Invalid JSON body"), 400);
  }

  const result = updateRouteSchema.safeParse(body);
  if (!result.success) {
    return c.json(validationError("Invalid update data", result.error.flatten()), 400);
  }

  const input = result.data;
  const updated = await repo.update(id, user.id, input);

  if (!updated) {
    // Could be not found OR version conflict — check existence
    const existing = await repo.findById(id, user.id);
    if (!existing) {
      return c.json(
        { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
        404,
      );
    }
    return c.json(
      {
        error: {
          code: "VERSION_CONFLICT",
          message: "Route was modified by another request. Refresh and try again.",
          details: { currentVersion: existing.version },
        },
      },
      409,
    );
  }

  // If waypoints were provided, replace them
  if (input.waypoints) {
    await repo.replaceWaypoints(id, input.waypoints);
  }

  return c.json({ data: formatRoute(updated) });
});

// ── DELETE /api/routes/:id ───────────────────────────────────────────────────

routeRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const deleted = await repo.softDelete(id, user.id);
  if (!deleted) {
    return c.json(
      { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
      404,
    );
  }

  return c.json({ data: { id } });
});

// ── PUT /api/routes/:id/waypoints ────────────────────────────────────────────

routeRoutes.put("/:id/waypoints", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(validationError("Invalid JSON body"), 400);
  }

  const result = updateWaypointsSchema.safeParse(body);
  if (!result.success) {
    return c.json(validationError("Invalid waypoints data", result.error.flatten()), 400);
  }

  // Verify route exists and belongs to user
  const route = await repo.findById(id, user.id);
  if (!route) {
    return c.json(
      { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
      404,
    );
  }

  const coords = result.data.waypoints.map((w) => w.position);
  await repo.replaceWaypoints(id, coords);

  return c.json({ data: { routeId: id, count: coords.length } });
});

// ── POST /api/routes/import ──────────────────────────────────────────────────

const MAX_GPX_SIZE = 10 * 1024 * 1024; // 10 MB

routeRoutes.post("/import", async (c) => {
  const user = c.get("user");

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json(validationError("No GPX file uploaded"), 400);
  }

  if (file.size > MAX_GPX_SIZE) {
    return c.json(validationError("File exceeds 10 MB size limit"), 400);
  }

  const xml = await file.text();

  let parsed;
  try {
    parsed = parseGpx(xml);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse GPX file";
    return c.json(validationError(message), 400);
  }

  const nameOverride = typeof body["name"] === "string" ? body["name"] : undefined;
  const activityRaw = typeof body["activityType"] === "string" ? body["activityType"] : undefined;
  const activityResult = activityRaw ? activityTypeSchema.safeParse(activityRaw) : null;
  const activityType = activityResult?.success ? activityResult.data : undefined;

  let importResult;
  try {
    importResult = gpxToRouteInput(parsed, { name: nameOverride, activityType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to convert GPX to route";
    return c.json(validationError(message), 400);
  }

  const route = await repo.create(user.id, importResult.route, "gpx");
  await repo.createWaypointsFromInput(route.id, importResult.waypoints);

  return c.json({ data: formatRoute(route) }, 201);
});

// ── POST /api/routes/:id/recalculate-elevation ──────────────────────────────

const recalcElevationAdapter = new ValhallaElevationAdapter();

routeRoutes.post("/:id/recalculate-elevation", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const route = await repo.findById(id, user.id);
  if (!route) {
    return c.json(
      { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
      404,
    );
  }

  if (!route.geometryJson) {
    return c.json(
      validationError("Route has no geometry — cannot recalculate elevation"),
      400,
    );
  }

  const geometry = JSON.parse(route.geometryJson);
  const coords: number[][] = geometry.coordinates;

  // Re-fetch elevation from Valhalla/Open-Meteo for all coordinates
  const coords2D: [number, number][] = coords.map((c) => [c[0]!, c[1]!]);
  const freshElevations = await recalcElevationAdapter.getElevations(coords2D);

  const hasData = freshElevations.some((e) => e !== null);
  if (!hasData) {
    return c.json(
      validationError("Could not fetch elevation data from any provider"),
      502,
    );
  }

  // Build updated 3D coordinates and compute stats
  const updatedCoords = coords2D.map(([lng, lat], i) => [lng, lat, freshElevations[i] ?? 0]);
  const elevations = updatedCoords.map((c) => c[2]!);
  const stats = elevationStats(elevations);
  const gainM = Math.round(stats.gain);
  const lossM = Math.round(stats.loss);

  // Update geometry with new Z values + elevation stats
  const updatedGeometry = { type: "LineString", coordinates: updatedCoords };
  const updated = await repo.updateGeometryAndElevation(id, user.id, updatedGeometry, gainM, lossM);

  return c.json({
    data: {
      ...formatRoute(updated!),
      _recalculated: {
        elevationGainM: gainM,
        elevationLossM: lossM,
      },
    },
  });
});

// ── GET /api/routes/:id/export ──────────────────────────────────────────────

routeRoutes.get("/:id/export", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const route = await repo.findById(id, user.id);
  if (!route) {
    return c.json(
      { error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } },
      404,
    );
  }

  const { waypoints: wps, ...routeData } = route;
  const formatted = {
    ...formatRoute(routeData),
    waypoints: wps.map(formatWaypoint),
  };

  const gpxData = routeToGpx(formatted);
  const xml = serializeGpx(gpxData);

  const filename = formatted.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${filename}.gpx"`,
    },
  });
});

export { routeRoutes };
