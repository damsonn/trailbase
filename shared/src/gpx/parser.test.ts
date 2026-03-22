import { describe, it, expect } from "vitest";
import { parseGpx, serializeGpx } from "./parser.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MINIMAL_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <name>Test Track</name>
    <desc>A test description</desc>
  </metadata>
  <trk>
    <name>Track 1</name>
    <trkseg>
      <trkpt lat="-33.856784" lon="151.215297">
        <ele>10.5</ele>
      </trkpt>
      <trkpt lat="-33.870943" lon="151.208755">
        <ele>25.3</ele>
      </trkpt>
      <trkpt lat="-33.891401" lon="151.276345">
        <ele>5.1</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const ROUTE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <rte>
    <name>Route 1</name>
    <rtept lat="48.8566" lon="2.3522">
      <ele>35.0</ele>
    </rtept>
    <rtept lat="48.8584" lon="2.2945">
      <ele>40.0</ele>
    </rtept>
  </rte>
</gpx>`;

const MULTI_TRACK_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Track A</name>
    <trkseg>
      <trkpt lat="1.0" lon="2.0"><ele>100</ele></trkpt>
      <trkpt lat="3.0" lon="4.0"><ele>200</ele></trkpt>
    </trkseg>
  </trk>
  <trk>
    <name>Track B</name>
    <trkseg>
      <trkpt lat="5.0" lon="6.0"><ele>300</ele></trkpt>
      <trkpt lat="7.0" lon="8.0"><ele>400</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const WAYPOINTS_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <wpt lat="48.8566" lon="2.3522">
    <name>Eiffel Tower</name>
    <ele>35.0</ele>
  </wpt>
  <wpt lat="48.8606" lon="2.3376">
    <name>Louvre</name>
  </wpt>
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt>
      <trkpt lat="48.8606" lon="2.3376"><ele>30</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const MISSING_ELEVATION_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="1.0" lon="2.0"><ele>100</ele></trkpt>
      <trkpt lat="3.0" lon="4.0"/>
      <trkpt lat="5.0" lon="6.0"><ele>300</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

// ── Parser Tests ─────────────────────────────────────────────────────────────

describe("parseGpx", () => {
  it("parses a minimal GPX with one track and metadata", () => {
    const result = parseGpx(MINIMAL_GPX);

    expect(result.name).toBe("Test Track");
    expect(result.description).toBe("A test description");
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]!.name).toBe("Track 1");
    expect(result.tracks[0]!.coordinates).toHaveLength(3);
    expect(result.tracks[0]!.coordinates[0]).toEqual({ lat: -33.856784, lng: 151.215297 });
    expect(result.tracks[0]!.elevations).toEqual([10.5, 25.3, 5.1]);
  });

  it("parses GPX with <rte>/<rtept> as a track", () => {
    const result = parseGpx(ROUTE_GPX);

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]!.name).toBe("Route 1");
    expect(result.tracks[0]!.coordinates).toHaveLength(2);
    expect(result.tracks[0]!.coordinates[0]).toEqual({ lat: 48.8566, lng: 2.3522 });
  });

  it("parses GPX with multiple tracks", () => {
    const result = parseGpx(MULTI_TRACK_GPX);

    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0]!.name).toBe("Track A");
    expect(result.tracks[1]!.name).toBe("Track B");
    expect(result.tracks[0]!.coordinates[0]).toEqual({ lat: 1, lng: 2 });
    expect(result.tracks[1]!.coordinates[0]).toEqual({ lat: 5, lng: 6 });
  });

  it("parses standalone waypoints", () => {
    const result = parseGpx(WAYPOINTS_GPX);

    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0]!.name).toBe("Eiffel Tower");
    expect(result.waypoints[0]!.coordinate).toEqual({ lat: 48.8566, lng: 2.3522 });
    expect(result.waypoints[0]!.elevation).toBe(35);
    expect(result.waypoints[1]!.name).toBe("Louvre");
    expect(result.waypoints[1]!.elevation).toBeUndefined();
  });

  it("handles missing elevation with null", () => {
    const result = parseGpx(MISSING_ELEVATION_GPX);

    expect(result.tracks[0]!.elevations).toEqual([100, null, 300]);
  });

  it("throws on non-XML input", () => {
    expect(() => parseGpx("this is not xml")).toThrow("Invalid GPX: missing <gpx> root element");
  });

  it("throws on valid XML without <gpx> root", () => {
    expect(() => parseGpx('<?xml version="1.0"?><root><item/></root>')).toThrow(
      "missing <gpx> root element",
    );
  });

  it("throws on GPX with no tracks, routes, or waypoints", () => {
    const emptyGpx = '<?xml version="1.0"?><gpx version="1.1"></gpx>';
    expect(() => parseGpx(emptyGpx)).toThrow("no tracks, routes, or waypoints found");
  });

  it("throws on coordinates out of range", () => {
    const badGpx = `<?xml version="1.0"?>
    <gpx version="1.1">
      <trk><trkseg>
        <trkpt lat="91.0" lon="0.0"/>
        <trkpt lat="0.0" lon="0.0"/>
      </trkseg></trk>
    </gpx>`;
    expect(() => parseGpx(badGpx)).toThrow("Coordinate out of range");
  });
});

// ── Serializer Tests ─────────────────────────────────────────────────────────

describe("serializeGpx", () => {
  it("produces valid GPX XML with declaration and namespace", () => {
    const xml = serializeGpx({
      name: "Test",
      tracks: [
        {
          name: "T1",
          coordinates: [
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
          ],
          elevations: [100, 200],
        },
      ],
      waypoints: [],
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(xml).toContain("<name>Test</name>");
    expect(xml).toContain('lat="1.000000" lon="2.000000"');
    expect(xml).toContain("<ele>100.0</ele>");
  });

  it("omits elevation when null", () => {
    const xml = serializeGpx({
      tracks: [
        {
          coordinates: [
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
          ],
          elevations: [null, null],
        },
      ],
      waypoints: [],
    });

    expect(xml).not.toContain("<ele>");
  });

  it("serializes waypoints", () => {
    const xml = serializeGpx({
      tracks: [],
      waypoints: [
        { name: "WP1", coordinate: { lat: 10, lng: 20 }, elevation: 50 },
        { coordinate: { lat: 30, lng: 40 } },
      ],
    });

    expect(xml).toContain('<wpt lat="10.000000" lon="20.000000">');
    expect(xml).toContain("<name>WP1</name>");
    expect(xml).toContain("<ele>50.0</ele>");
  });

  it("escapes special XML characters in names", () => {
    const xml = serializeGpx({
      name: 'Track & <"test">',
      tracks: [],
      waypoints: [{ coordinate: { lat: 1, lng: 2 } }],
    });

    expect(xml).toContain("Track &amp; &lt;&quot;test&quot;&gt;");
  });

  it("round-trips: serialize → parse produces equivalent data", () => {
    const original = parseGpx(MINIMAL_GPX);
    const xml = serializeGpx(original);
    const roundTripped = parseGpx(xml);

    expect(roundTripped.name).toBe(original.name);
    expect(roundTripped.description).toBe(original.description);
    expect(roundTripped.tracks).toHaveLength(original.tracks.length);
    expect(roundTripped.tracks[0]!.coordinates).toHaveLength(
      original.tracks[0]!.coordinates.length,
    );
    // Compare with tolerance for floating point
    for (let i = 0; i < original.tracks[0]!.coordinates.length; i++) {
      expect(roundTripped.tracks[0]!.coordinates[i]!.lat).toBeCloseTo(
        original.tracks[0]!.coordinates[i]!.lat,
        5,
      );
      expect(roundTripped.tracks[0]!.coordinates[i]!.lng).toBeCloseTo(
        original.tracks[0]!.coordinates[i]!.lng,
        5,
      );
    }
  });
});
