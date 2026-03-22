import { describe, it, expect } from "vitest";
import { gpxToRouteInput, routeToGpx, type RouteForExport } from "./convert.js";
import type { ParsedGpx } from "../schemas/gpx.js";

const SINGLE_TRACK_GPX: ParsedGpx = {
  name: "Sydney Walk",
  description: "Harbour Bridge to Bondi",
  tracks: [
    {
      name: "Main Track",
      coordinates: [
        { lat: -33.856784, lng: 151.215297 },
        { lat: -33.870943, lng: 151.208755 },
        { lat: -33.891401, lng: 151.276345 },
      ],
      elevations: [10, 25, 5],
    },
  ],
  waypoints: [
    { name: "Viewpoint", coordinate: { lat: -33.860000, lng: 151.210000 }, elevation: 15 },
  ],
};

const MULTI_TRACK_GPX: ParsedGpx = {
  name: "Multi-Track",
  tracks: [
    {
      name: "Part 1",
      coordinates: [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ],
      elevations: [100, 200],
    },
    {
      name: "Part 2",
      coordinates: [
        { lat: 5, lng: 6 },
        { lat: 7, lng: 8 },
      ],
      elevations: [300, 400],
    },
  ],
  waypoints: [],
};

describe("gpxToRouteInput", () => {
  it("converts a single-track GPX to route input", () => {
    const { route } = gpxToRouteInput(SINGLE_TRACK_GPX);

    expect(route.name).toBe("Sydney Walk");
    expect(route.activityType).toBe("hike");
    expect(route.geometry).toBeDefined();
    expect(route.geometry!.type).toBe("LineString");
    // GeoJSON coordinates should be [lng, lat, ele]
    expect(route.geometry!.coordinates[0]).toEqual([151.215297, -33.856784, 10]);
    expect(route.geometry!.coordinates[2]).toEqual([151.276345, -33.891401, 5]);
    expect(route.distanceM).toBeGreaterThan(0);
    expect(route.elevationGainM).toBe(15); // 10→25 = +15
    expect(route.elevationLossM).toBe(20); // 25→5 = -20
  });

  it("creates start, end, and POI waypoints", () => {
    const { waypoints } = gpxToRouteInput(SINGLE_TRACK_GPX);

    expect(waypoints).toHaveLength(3); // start + 1 GPX wpt + end
    expect(waypoints[0]!.name).toBe("Start");
    expect(waypoints[0]!.type).toBe("via");
    expect(waypoints[1]!.name).toBe("Viewpoint");
    expect(waypoints[1]!.type).toBe("poi");
    expect(waypoints[2]!.name).toBe("End");
    expect(waypoints[2]!.type).toBe("via");
  });

  it("merges multiple tracks by default", () => {
    const { route } = gpxToRouteInput(MULTI_TRACK_GPX);

    expect(route.geometry!.coordinates).toHaveLength(4);
    expect(route.geometry!.coordinates[0]).toEqual([2, 1, 100]);
    expect(route.geometry!.coordinates[3]).toEqual([8, 7, 400]);
  });

  it("uses first track with 'first' strategy", () => {
    const { route } = gpxToRouteInput(MULTI_TRACK_GPX, { mergeStrategy: "first" });

    expect(route.geometry!.coordinates).toHaveLength(2);
    expect(route.geometry!.coordinates[0]).toEqual([2, 1, 100]);
  });

  it("uses longest track with 'longest' strategy", () => {
    // Both tracks have same length, so it should pick the last one checked (reducer behavior)
    const longerGpx: ParsedGpx = {
      ...MULTI_TRACK_GPX,
      tracks: [
        MULTI_TRACK_GPX.tracks[0]!,
        {
          name: "Longer",
          coordinates: [
            { lat: 10, lng: 11 },
            { lat: 12, lng: 13 },
            { lat: 14, lng: 15 },
          ],
          elevations: [100, 200, 300],
        },
      ],
    };
    const { route } = gpxToRouteInput(longerGpx, { mergeStrategy: "longest" });

    expect(route.geometry!.coordinates).toHaveLength(3);
  });

  it("respects name and activityType overrides", () => {
    const { route } = gpxToRouteInput(SINGLE_TRACK_GPX, {
      name: "Custom Name",
      activityType: "bike",
    });

    expect(route.name).toBe("Custom Name");
    expect(route.activityType).toBe("bike");
  });

  it("throws when no tracks are present", () => {
    const noTracks: ParsedGpx = { tracks: [], waypoints: [{ coordinate: { lat: 1, lng: 2 } }] };
    expect(() => gpxToRouteInput(noTracks)).toThrow("No tracks found");
  });
});

describe("routeToGpx", () => {
  const ROUTE: RouteForExport = {
    name: "Test Route",
    description: "A test route",
    geometry: {
      type: "LineString",
      coordinates: [
        [151.215297, -33.856784, 10],
        [151.208755, -33.870943, 25],
      ],
    },
    waypoints: [
      {
        position: { lat: -33.856784, lng: 151.215297 },
        elevationM: 10,
        name: "Start",
        type: "via",
      },
      {
        position: { lat: -33.860000, lng: 151.210000 },
        elevationM: 15,
        name: "Viewpoint",
        type: "poi",
      },
    ],
  };

  it("converts route geometry to GPX track", () => {
    const gpx = routeToGpx(ROUTE);

    expect(gpx.name).toBe("Test Route");
    expect(gpx.description).toBe("A test route");
    expect(gpx.tracks).toHaveLength(1);
    expect(gpx.tracks[0]!.coordinates[0]).toEqual({ lat: -33.856784, lng: 151.215297 });
    expect(gpx.tracks[0]!.elevations).toEqual([10, 25]);
  });

  it("exports POI waypoints but not via waypoints", () => {
    const gpx = routeToGpx(ROUTE);

    expect(gpx.waypoints).toHaveLength(1);
    expect(gpx.waypoints[0]!.name).toBe("Viewpoint");
  });

  it("handles route with no geometry", () => {
    const noGeometry = { ...ROUTE, geometry: null };
    const gpx = routeToGpx(noGeometry);

    expect(gpx.tracks).toHaveLength(0);
  });
});
