import type {
  ParsedGpx,
  GpxTrack,
  GpxWaypoint,
} from "../schemas/gpx.js";

// Re-export types for consumers that import from gpx/parser
export type { ParsedGpx, GpxTrack, GpxWaypoint };

// TODO: Implement GPX XML parsing
// This will be implemented in a future task using a streaming XML parser
// that works in both Node.js and browser environments.
export function parseGpx(_xml: string): ParsedGpx {
  throw new Error("GPX parser not yet implemented");
}

export function serializeGpx(_data: ParsedGpx): string {
  throw new Error("GPX serializer not yet implemented");
}
