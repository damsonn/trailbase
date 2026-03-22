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
