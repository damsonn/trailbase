import { z } from "zod";
import { coordinateSchema } from "./route.js";

export const gpxWaypointSchema = z.object({
  name: z.string().optional(),
  coordinate: coordinateSchema,
  elevation: z.number().optional(),
});
export type GpxWaypoint = z.infer<typeof gpxWaypointSchema>;

export const gpxTrackSchema = z.object({
  name: z.string().optional(),
  coordinates: z.array(coordinateSchema).min(2),
  elevations: z.array(z.number().nullable()),
});
export type GpxTrack = z.infer<typeof gpxTrackSchema>;

export const parsedGpxSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  tracks: z.array(gpxTrackSchema),
  waypoints: z.array(gpxWaypointSchema),
});
export type ParsedGpx = z.infer<typeof parsedGpxSchema>;
