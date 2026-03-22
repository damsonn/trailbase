import type { ParsedGpx } from "../schemas/gpx.js";
import type {
  CreateRouteInput,
  WaypointInput,
  LineString,
  Coordinate,
} from "../schemas/route.js";
import { totalDistance, elevationStats } from "../geo/distance.js";

// ── GPX → Route ──────────────────────────────────────────────────────────────

export interface GpxImportOptions {
  /** How to handle multiple tracks. Default: "merge" (concatenate all). */
  mergeStrategy?: "first" | "merge" | "longest";
  /** Override the route name (otherwise taken from GPX metadata or first track). */
  name?: string;
  /** Activity type. Default: "hike". */
  activityType?: "bike" | "hike" | "car";
}

export interface GpxImportResult {
  route: CreateRouteInput;
  waypoints: WaypointInput[];
}

/**
 * Convert a parsed GPX into a CreateRouteInput + waypoint inputs.
 * Handles multi-track merging and coordinate order conversion (lat/lng → GeoJSON [lng,lat]).
 */
export function gpxToRouteInput(
  parsed: ParsedGpx,
  options: GpxImportOptions = {},
): GpxImportResult {
  const { mergeStrategy = "merge", activityType = "hike" } = options;

  if (parsed.tracks.length === 0) {
    throw new Error("No tracks found in GPX to create a route");
  }

  // Select/merge coordinates based on strategy
  let coordinates: Coordinate[];
  let elevations: (number | null)[];

  if (parsed.tracks.length === 1 || mergeStrategy === "first") {
    const track = parsed.tracks[0]!;
    coordinates = track.coordinates;
    elevations = track.elevations;
  } else if (mergeStrategy === "longest") {
    const longest = parsed.tracks.reduce((a, b) =>
      b.coordinates.length > a.coordinates.length ? b : a,
    );
    coordinates = longest.coordinates;
    elevations = longest.elevations;
  } else {
    // merge: concatenate all tracks
    coordinates = [];
    elevations = [];
    for (const track of parsed.tracks) {
      coordinates.push(...track.coordinates);
      elevations.push(...track.elevations);
    }
  }

  // Build GeoJSON LineString (note: GeoJSON uses [lng, lat, ele?] order)
  const geojsonCoords: number[][] = coordinates.map((c, i) => {
    const ele = elevations[i];
    return ele !== null && ele !== undefined ? [c.lng, c.lat, ele] : [c.lng, c.lat];
  });

  const geometry: LineString = {
    type: "LineString",
    coordinates: geojsonCoords,
  };

  // Compute distance and elevation stats
  const distanceM = totalDistance(coordinates);
  const validElevations = elevations.filter((e): e is number => e !== null);
  const eleStats = validElevations.length >= 2 ? elevationStats(validElevations) : null;

  // Derive name
  const routeName =
    options.name ??
    parsed.name ??
    parsed.tracks[0]?.name ??
    "Imported GPX Route";

  // Build waypoints from first and last coordinate + GPX waypoints
  const waypointInputs: WaypointInput[] = [];
  let sortOrder = 0;

  // Start waypoint
  waypointInputs.push({
    position: coordinates[0]!,
    elevationM: elevations[0] ?? null,
    sortOrder: sortOrder++,
    name: "Start",
    type: "via",
  });

  // GPX waypoints
  for (const wpt of parsed.waypoints) {
    waypointInputs.push({
      position: wpt.coordinate,
      elevationM: wpt.elevation ?? null,
      sortOrder: sortOrder++,
      name: wpt.name ?? null,
      type: "poi",
    });
  }

  // End waypoint
  const lastCoord = coordinates[coordinates.length - 1]!;
  const lastEle = elevations[elevations.length - 1];
  waypointInputs.push({
    position: lastCoord,
    elevationM: lastEle ?? null,
    sortOrder,
    name: "End",
    type: "via",
  });

  const route: CreateRouteInput = {
    name: routeName,
    activityType,
    waypoints: [coordinates[0]!, lastCoord],
    geometry,
    distanceM: Math.round(distanceM),
    ...(eleStats && {
      elevationGainM: Math.round(eleStats.gain),
      elevationLossM: Math.round(eleStats.loss),
    }),
  };

  return { route, waypoints: waypointInputs };
}

// ── Route → GPX ──────────────────────────────────────────────────────────────

/** Minimal shape needed from a route for GPX export. */
export interface RouteForExport {
  name: string;
  description?: string | null;
  geometry: LineString | null;
  waypoints: Array<{
    position: Coordinate;
    elevationM?: number | null;
    name?: string | null;
    type: "via" | "stop" | "poi";
  }>;
}

/**
 * Convert a route with waypoints back to a ParsedGpx for serialization.
 */
export function routeToGpx(route: RouteForExport): ParsedGpx {
  const tracks = [];

  if (route.geometry) {
    // GeoJSON [lng, lat, ele?] → GPX coordinates + elevations
    const coordinates = route.geometry.coordinates.map((c) => ({
      lat: c[1]!,
      lng: c[0]!,
    }));
    const elevations = route.geometry.coordinates.map((c) =>
      c.length >= 3 ? c[2]! : null,
    );

    tracks.push({
      name: route.name,
      coordinates,
      elevations,
    });
  }

  // Convert route waypoints to GPX waypoints (excluding via waypoints which are just routing nodes)
  const waypoints = route.waypoints
    .filter((w) => w.type === "poi" || w.type === "stop")
    .map((w) => ({
      name: w.name ?? undefined,
      coordinate: w.position,
      elevation: w.elevationM ?? undefined,
    }));

  return {
    name: route.name,
    description: route.description ?? undefined,
    tracks,
    waypoints,
  };
}
