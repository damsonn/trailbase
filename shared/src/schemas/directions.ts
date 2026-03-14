import { z } from "zod";
import { coordinateSchema, activityTypeSchema } from "./route.js";

// ── Directions Request ──────────────────────────────────────────────────────

export const directionsRequestSchema = z.object({
  waypoints: z.array(coordinateSchema).min(2),
  profile: activityTypeSchema,
  options: z
    .object({
      avoidHighways: z.boolean().optional(),
      avoidTolls: z.boolean().optional(),
      preferTrails: z.boolean().optional(),
    })
    .optional(),
});
export type DirectionsRequest = z.infer<typeof directionsRequestSchema>;

// ── Directions Response ─────────────────────────────────────────────────────

export const directionsSegmentSchema = z.object({
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.array(z.number())),
  }),
  distanceM: z.number(),
  durationS: z.number().optional(),
});
export type DirectionsSegment = z.infer<typeof directionsSegmentSchema>;

export const directionsResultSchema = z.object({
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.array(z.number())),
  }),
  distanceM: z.number(),
  elevationGainM: z.number(),
  elevationLossM: z.number(),
  durationS: z.number().optional(),
  segments: z.array(directionsSegmentSchema),
});
export type DirectionsResult = z.infer<typeof directionsResultSchema>;
