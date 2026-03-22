import type {
  RoutingProvider,
  RouteRequest,
  RouteResult,
  RouteSegment,
} from "@trailbase/shared";
import type { ActivityType } from "@trailbase/shared";

const PROFILE_MAP: Record<ActivityType, string> = {
  bike: "bicycle",
  hike: "pedestrian",
  car: "auto",
};

interface ValhallaLocation {
  lat: number;
  lon: number;
}

interface ValhallaRequest {
  locations: ValhallaLocation[];
  costing: string;
  directions_options: { units: string };
}

export class ValhallaAdapter implements RoutingProvider {
  id = "valhalla";
  name = "Valhalla";
  supportedProfiles: ActivityType[] = ["bike", "hike", "car"];

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env["VALHALLA_URL"] ?? "http://localhost:8002";
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    const costing = PROFILE_MAP[request.profile];
    if (!costing) {
      throw new Error(`Unsupported profile: ${request.profile}`);
    }

    const valhallaReq: ValhallaRequest = {
      locations: request.waypoints.map((wp) => ({
        lat: wp.lat,
        lon: wp.lng,
      })),
      costing,
      directions_options: { units: "kilometers" },
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valhallaReq),
      });
    } catch {
      throw new Error(
        `Routing service unavailable (${this.baseUrl}). Is Valhalla running?`,
      );
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Valhalla error (${res.status}): ${body}`);
    }

    const data = (await res.json()) as ValhallaResponse;
    return this.parseResponse(data);
  }

  private parseResponse(data: ValhallaResponse): RouteResult {
    const trip = data.trip;
    const legs = trip.legs;

    // Decode all leg shapes and merge into one geometry
    const allCoords: [number, number][] = [];
    const segments: RouteSegment[] = [];

    for (const leg of legs) {
      const coords = decodePolyline6(leg.shape);

      segments.push({
        geometry: {
          type: "LineString",
          coordinates: coords.map(([lat, lng]) => [lng, lat]),
        },
        distanceM: leg.summary.length * 1000,
        durationS: leg.summary.time,
      });

      // Avoid duplicating junction points between legs
      const startIdx = allCoords.length > 0 ? 1 : 0;
      for (let i = startIdx; i < coords.length; i++) {
        allCoords.push([coords[i]![1]!, coords[i]![0]!]); // [lng, lat] for GeoJSON
      }
    }

    const summary = trip.summary;

    return {
      geometry: {
        type: "LineString",
        coordinates: allCoords,
      },
      distanceM: summary.length * 1000,
      elevationGainM: 0,
      elevationLossM: 0,
      durationS: summary.time,
      segments,
    };
  }
}

// ── Elevation calculation ─────────────────────────────────────────────────────

/**
 * Calculate elevation gain/loss from 3D coordinates using a dead-band filter.
 * Ignores elevation changes smaller than `threshold` to filter GPS/DEM noise.
 */
export function calculateElevation(
  coords: number[][],
  threshold = 4,
): { gain: number; loss: number } {
  if (coords.length < 2) return { gain: 0, loss: 0 };

  let gain = 0;
  let loss = 0;
  let ref = coords[0]![2]!;

  for (let i = 1; i < coords.length; i++) {
    const delta = coords[i]![2]! - ref;
    if (delta > threshold) {
      gain += delta;
      ref = coords[i]![2]!;
    } else if (delta < -threshold) {
      loss += Math.abs(delta);
      ref = coords[i]![2]!;
    }
  }

  return { gain: Math.round(gain), loss: Math.round(loss) };
}

// ── Valhalla response types ─────────────────────────────────────────────────

interface ValhallaResponse {
  trip: {
    legs: ValhallaLeg[];
    summary: ValhallaSummary;
    status: number;
    status_message: string;
  };
}

interface ValhallaLeg {
  shape: string; // encoded polyline (precision 6)
  summary: ValhallaSummary;
}

interface ValhallaSummary {
  length: number; // km
  time: number; // seconds
  min_elevation?: number;
  max_elevation?: number;
}

// ── Polyline decoder (precision 6 for Valhalla) ─────────────────────────────

export function decodePolyline6(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e6, lng / 1e6]); // precision 6
  }

  return coords;
}
