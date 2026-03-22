export const ACTIVITY_LABELS: Record<string, string> = {
  bike: "Bike",
  hike: "Hike",
  car: "Car",
};

export const ACTIVITY_COLORS: Record<string, string> = {
  bike: "bg-info/10 text-info",
  hike: "bg-success/10 text-success",
  car: "bg-secondary/10 text-secondary",
};

export function formatDistance(m: number | null): string {
  if (m == null) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export function formatElevation(m: number | null): string {
  if (m == null) return "-";
  return `${Math.round(m)} m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Average speeds in km/h by activity type */
export const ACTIVITY_SPEEDS: Record<string, number> = {
  bike: 18,
  hike: 4.5,
  car: 60,
};

/** Estimate travel time in seconds from distance (meters) and activity type */
export function estimateTimeSeconds(
  distanceM: number,
  activityType: string,
): number {
  const speedKmh = ACTIVITY_SPEEDS[activityType] ?? ACTIVITY_SPEEDS.hike!;
  const speedMs = (speedKmh * 1000) / 3600;
  return distanceM / speedMs;
}

/** Format a duration in seconds to a human-readable string */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
