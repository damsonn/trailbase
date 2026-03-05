import type { Coordinate } from "../schemas/route.js";

/** Parsed GPX data in a normalized format. */
export interface ParsedGpx {
  name?: string;
  description?: string;
  tracks: GpxTrack[];
  waypoints: GpxWaypoint[];
}

export interface GpxTrack {
  name?: string;
  coordinates: Coordinate[];
  elevations: (number | null)[];
}

export interface GpxWaypoint {
  name?: string;
  coordinate: Coordinate;
  elevation?: number;
}

// TODO: Implement GPX XML parsing
// This will be implemented in a future task using a streaming XML parser
// that works in both Node.js and browser environments.
export function parseGpx(_xml: string): ParsedGpx {
  throw new Error("GPX parser not yet implemented");
}

export function serializeGpx(_data: ParsedGpx): string {
  throw new Error("GPX serializer not yet implemented");
}
