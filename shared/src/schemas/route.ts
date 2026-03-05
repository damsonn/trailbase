import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────────────────────

export const activityTypeSchema = z.enum(["bike", "hike", "car"]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const sourceFormatSchema = z.enum(["manual", "gpx", "geojson"]);
export type SourceFormat = z.infer<typeof sourceFormatSchema>;

export const waypointTypeSchema = z.enum(["via", "stop", "poi"]);
export type WaypointType = z.infer<typeof waypointTypeSchema>;

// ── Coordinate ──────────────────────────────────────────────────────────────

export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinate = z.infer<typeof coordinateSchema>;

// ── Waypoint ────────────────────────────────────────────────────────────────

export const waypointSchema = z.object({
  id: z.string().uuid(),
  routeId: z.string().uuid(),
  position: coordinateSchema,
  elevationM: z.number().nullable(),
  sortOrder: z.number().int(),
  name: z.string().nullable(),
  type: waypointTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Waypoint = z.infer<typeof waypointSchema>;

export const waypointInputSchema = z.object({
  position: coordinateSchema,
  elevationM: z.number().nullable().optional(),
  sortOrder: z.number().int(),
  name: z.string().max(255).nullable().optional(),
  type: waypointTypeSchema.default("via"),
});
export type WaypointInput = z.infer<typeof waypointInputSchema>;

export const updateWaypointsSchema = z.object({
  waypoints: z.array(waypointInputSchema).min(2),
});
export type UpdateWaypointsInput = z.infer<typeof updateWaypointsSchema>;

// ── Route ───────────────────────────────────────────────────────────────────

export const routeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).nullable(),
  activityType: activityTypeSchema,
  geometry: z.unknown(), // GeoJSON LineString
  distanceM: z.number().nullable(),
  elevationGainM: z.number().nullable(),
  elevationLossM: z.number().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  sourceFormat: sourceFormatSchema,
  deletedAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Route = z.infer<typeof routeSchema>;

export const routeWithWaypointsSchema = routeSchema.extend({
  waypoints: z.array(waypointSchema),
});
export type RouteWithWaypoints = z.infer<typeof routeWithWaypointsSchema>;

export const createRouteSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  activityType: activityTypeSchema,
  waypoints: z.array(coordinateSchema).min(2),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;

export const updateRouteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  activityType: activityTypeSchema.optional(),
  waypoints: z.array(coordinateSchema).min(2).optional(),
  version: z.number().int(),
});
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;

export const routeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  activityType: activityTypeSchema.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "distanceM"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(255).optional(),
});
export type RouteListQuery = z.infer<typeof routeListQuerySchema>;
