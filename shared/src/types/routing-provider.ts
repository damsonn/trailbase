import type { ActivityType, Coordinate } from "../schemas/route.js";

export interface RoutingProvider {
  id: string;
  name: string;
  supportedProfiles: ActivityType[];
  getRoute(request: RouteRequest): Promise<RouteResult>;
}

export interface RouteRequest {
  waypoints: Coordinate[];
  profile: ActivityType;
  options?: {
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    preferTrails?: boolean;
  };
}

export interface RouteResult {
  geometry: GeoJSON.LineString;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  durationS?: number;
  segments: RouteSegment[];
  instructions?: TurnInstruction[];
}

export interface RouteSegment {
  geometry: GeoJSON.LineString;
  distanceM: number;
  durationS?: number;
}

export interface TurnInstruction {
  type: string;
  text: string;
  distanceM: number;
  coordinate: Coordinate;
}
