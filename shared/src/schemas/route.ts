import { z } from "zod";

export const activityTypeSchema = z.enum(["bike", "hike", "car"]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinate = z.infer<typeof coordinateSchema>;

export const waypointSchema = z.object({
  id: z.string().uuid(),
  routeId: z.string().uuid(),
  position: coordinateSchema,
  elevationM: z.number().nullable(),
  sortOrder: z.number().int(),
  name: z.string().nullable(),
  type: z.enum(["via", "stop", "poi"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Waypoint = z.infer<typeof waypointSchema>;

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
  sourceFormat: z.enum(["manual", "gpx", "geojson"]),
  deletedAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Route = z.infer<typeof routeSchema>;

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
