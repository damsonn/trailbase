import type { Coordinate } from "../schemas/route.js";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance between two coordinates in meters. */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Total distance along an array of coordinates in meters. */
export function totalDistance(coords: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i - 1]!, coords[i]!);
  }
  return total;
}

/**
 * Calculate total elevation gain and loss from an array of elevations (meters).
 *
 * Uses a dead-band (threshold) filter to ignore GPS/DEM noise: elevation
 * changes are only counted when the cumulative change from the last accepted
 * reference point exceeds the threshold. This matches the approach used by
 * Garmin, Strava, and RideWithGPS (typically 3–5 m).
 */
export function elevationStats(
  elevations: number[],
  /** Minimum elevation change (m) to count. Default 4 m. */
  threshold = 4,
): {
  gain: number;
  loss: number;
} {
  if (elevations.length < 2) return { gain: 0, loss: 0 };

  let gain = 0;
  let loss = 0;
  let ref = elevations[0]!;

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i]! - ref;
    if (diff > threshold) {
      gain += diff;
      ref = elevations[i]!;
    } else if (diff < -threshold) {
      loss += Math.abs(diff);
      ref = elevations[i]!;
    }
  }

  return { gain, loss };
}
