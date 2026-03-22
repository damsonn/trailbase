import { XMLParser } from "fast-xml-parser";
import { parsedGpxSchema } from "../schemas/gpx.js";
import type { ParsedGpx, GpxTrack, GpxWaypoint } from "../schemas/gpx.js";

// Re-export types for consumers that import from gpx/parser
export type { ParsedGpx, GpxTrack, GpxWaypoint };

// ── Helpers ──────────────────────────────────────────────────────────────────

type XmlNode = Record<string, unknown>;

/** Ensure a value is always an array (fast-xml-parser returns objects for single elements). */
function toArray(value: unknown): XmlNode[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value as XmlNode];
}

function parseCoord(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid coordinate value: ${value}`);
  return n;
}

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a GPX 1.1 XML string into a structured ParsedGpx object.
 * Supports `<trk>`, `<rte>`, and `<wpt>` elements.
 */
export function parseGpx(xml: string): ParsedGpx {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (name) => ["trk", "trkseg", "trkpt", "rte", "rtept", "wpt"].includes(name),
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid XML: the file could not be parsed");
  }

  const gpx = parsed["gpx"] as Record<string, unknown> | undefined;
  if (!gpx) {
    throw new Error("Invalid GPX: missing <gpx> root element");
  }

  // Metadata
  const metadata = gpx["metadata"] as Record<string, unknown> | undefined;
  const name = (metadata?.["name"] as string) ?? undefined;
  const description = (metadata?.["desc"] as string) ?? undefined;

  // Tracks from <trk> elements
  const tracks: GpxTrack[] = [];
  for (const trk of toArray(gpx["trk"])) {
    const trkName = (trk["name"] as string) ?? undefined;
    const coordinates: { lat: number; lng: number }[] = [];
    const elevations: (number | null)[] = [];

    for (const seg of toArray(trk["trkseg"])) {
      for (const pt of toArray(seg["trkpt"])) {
        const lat = parseCoord(pt["@_lat"]);
        const lng = parseCoord(pt["@_lon"]);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error(`Coordinate out of range: lat=${lat}, lon=${lng}`);
        }
        coordinates.push({ lat, lng });
        const ele = pt["ele"];
        elevations.push(ele !== undefined && ele !== null ? Number(ele) : null);
      }
    }

    if (coordinates.length >= 2) {
      tracks.push({ name: trkName, coordinates, elevations });
    }
  }

  // Routes from <rte> elements (treat as single-segment tracks)
  for (const rte of toArray(gpx["rte"])) {
    const rteName = (rte["name"] as string) ?? undefined;
    const coordinates: { lat: number; lng: number }[] = [];
    const elevations: (number | null)[] = [];

    for (const pt of toArray(rte["rtept"])) {
      const lat = parseCoord(pt["@_lat"]);
      const lng = parseCoord(pt["@_lon"]);
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`Coordinate out of range: lat=${lat}, lon=${lng}`);
      }
      coordinates.push({ lat, lng });
      const ele = pt["ele"];
      elevations.push(ele !== undefined && ele !== null ? Number(ele) : null);
    }

    if (coordinates.length >= 2) {
      tracks.push({ name: rteName, coordinates, elevations });
    }
  }

  // Waypoints from <wpt> elements
  const waypoints: GpxWaypoint[] = [];
  for (const wpt of toArray(gpx["wpt"])) {
    const lat = parseCoord(wpt["@_lat"]);
    const lng = parseCoord(wpt["@_lon"]);
    const wptName = (wpt["name"] as string) ?? undefined;
    const ele = wpt["ele"];
    waypoints.push({
      coordinate: { lat, lng },
      name: wptName,
      elevation: ele !== undefined && ele !== null ? Number(ele) : undefined,
    });
  }

  if (tracks.length === 0 && waypoints.length === 0) {
    throw new Error("Invalid GPX: no tracks, routes, or waypoints found");
  }

  const result: ParsedGpx = { name, description, tracks, waypoints };
  return parsedGpxSchema.parse(result);
}

// ── Serializer ───────────────────────────────────────────────────────────────

/** Escape special XML characters. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serialize a ParsedGpx object to a valid GPX 1.1 XML string.
 */
export function serializeGpx(data: ParsedGpx): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="trailbase"',
    '  xmlns="http://www.topografix.com/GPX/1/1"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
  ];

  // Metadata
  if (data.name || data.description) {
    lines.push("  <metadata>");
    if (data.name) lines.push(`    <name>${escapeXml(data.name)}</name>`);
    if (data.description) lines.push(`    <desc>${escapeXml(data.description)}</desc>`);
    lines.push("  </metadata>");
  }

  // Waypoints
  for (const wpt of data.waypoints) {
    lines.push(`  <wpt lat="${wpt.coordinate.lat.toFixed(6)}" lon="${wpt.coordinate.lng.toFixed(6)}">`);
    if (wpt.name) lines.push(`    <name>${escapeXml(wpt.name)}</name>`);
    if (wpt.elevation !== undefined) lines.push(`    <ele>${wpt.elevation.toFixed(1)}</ele>`);
    lines.push("  </wpt>");
  }

  // Tracks
  for (const track of data.tracks) {
    lines.push("  <trk>");
    if (track.name) lines.push(`    <name>${escapeXml(track.name)}</name>`);
    lines.push("    <trkseg>");
    for (let i = 0; i < track.coordinates.length; i++) {
      const coord = track.coordinates[i]!;
      const ele = track.elevations[i];
      lines.push(`      <trkpt lat="${coord.lat.toFixed(6)}" lon="${coord.lng.toFixed(6)}">`);
      if (ele !== null && ele !== undefined) {
        lines.push(`        <ele>${ele.toFixed(1)}</ele>`);
      }
      lines.push("      </trkpt>");
    }
    lines.push("    </trkseg>");
    lines.push("  </trk>");
  }

  lines.push("</gpx>");
  return lines.join("\n");
}
