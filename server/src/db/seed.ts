import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(databaseUrl);

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSeedGeometry(filename: string): {
  wkt: string;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
} {
  const data = JSON.parse(readFileSync(join(__dirname, filename), "utf-8"));
  const coords: number[][] = data.geometry.coordinates;
  const has3D = coords.some((c) => c.length >= 3 && c[2] != null);

  const wkt = has3D
    ? `LINESTRINGZ(${coords.map((c) => `${c[0]} ${c[1]} ${c[2] ?? 0}`).join(", ")})`
    : `LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;

  return {
    wkt,
    distanceM: data.distanceM,
    elevationGainM: data.elevationGainM ?? 0,
    elevationLossM: data.elevationLossM ?? 0,
  };
}

async function seed() {
  console.log("Seeding database...");

  const userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  // ── Dev user ────────────────────────────────────────────────────────────
  //   Email:    demo@trailbase.app
  //   Password: password
  // ───────────────────────────────────────────────────────────────────────
  await sql`
    INSERT INTO "user" (id, name, email, email_verified)
    VALUES (
      ${userId},
      'Demo User',
      'demo@trailbase.app',
      false
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO "account" (id, user_id, account_id, provider_id, password)
    VALUES (
      'acct-' || ${userId},
      ${userId},
      ${userId},
      'credential',
      '$2b$10$QR8BcZq.iJnsGm2vQyySB.vMMv5ojae2jxIxD7/oZ9qdtJes9foym'
    )
    ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password
  `;

  // Sydney Harbour Bridge to Bondi Beach route (real routed geometry from Valhalla)
  const harbourBridge = loadSeedGeometry("seed-harbour-bridge-to-bondi.json");
  await sql`
    INSERT INTO routes (id, user_id, name, description, activity_type, geometry, distance_m, elevation_gain_m, elevation_loss_m, source_format, metadata)
    VALUES (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      ${userId},
      'Harbour Bridge to Bondi',
      'A scenic ride from the Sydney Harbour Bridge through the city to Bondi Beach.',
      'bike',
      ST_GeogFromText(${harbourBridge.wkt}),
      ${harbourBridge.distanceM},
      ${harbourBridge.elevationGainM},
      ${harbourBridge.elevationLossM},
      'manual',
      '{"tags": ["coastal", "scenic"]}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      geometry = ST_GeogFromText(${harbourBridge.wkt}),
      distance_m = ${harbourBridge.distanceM},
      elevation_gain_m = ${harbourBridge.elevationGainM},
      elevation_loss_m = ${harbourBridge.elevationLossM}
  `;

  // Clean existing waypoints before re-seeding (waypoint IDs are auto-generated,
  // so ON CONFLICT doesn't prevent duplicates on repeated seed runs)
  await sql`
    DELETE FROM waypoints WHERE route_id IN (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
    )
  `;

  // Waypoints for the route
  await sql`
    INSERT INTO waypoints (route_id, position, elevation_m, sort_order, name, type)
    VALUES
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2108 -33.8523)'), 7, 0, 'Harbour Bridge', 'stop'),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2231 -33.8688)'), 25, 1, 'Hyde Park', 'via'),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2741 -33.8915)'), 10, 2, 'Bondi Beach', 'stop')
  `;

  // Blue Mountains hike (real routed geometry from Valhalla)
  const threeSisters = loadSeedGeometry("seed-three-sisters-loop.json");
  await sql`
    INSERT INTO routes (id, user_id, name, description, activity_type, geometry, distance_m, elevation_gain_m, elevation_loss_m, source_format, metadata)
    VALUES (
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      ${userId},
      'Three Sisters Loop',
      'Classic Blue Mountains walk with views of the Three Sisters rock formation.',
      'hike',
      ST_GeogFromText(${threeSisters.wkt}),
      ${threeSisters.distanceM},
      ${threeSisters.elevationGainM},
      ${threeSisters.elevationLossM},
      'manual',
      '{"tags": ["mountains", "loop", "views"]}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      geometry = ST_GeogFromText(${threeSisters.wkt}),
      distance_m = ${threeSisters.distanceM},
      elevation_gain_m = ${threeSisters.elevationGainM},
      elevation_loss_m = ${threeSisters.elevationLossM}
  `;

  await sql`
    INSERT INTO waypoints (route_id, position, elevation_m, sort_order, name, type)
    VALUES
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', ST_GeogFromText('POINT(150.3124 -33.7320)'), 920, 0, 'Echo Point', 'stop'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', ST_GeogFromText('POINT(150.3156 -33.7310)'), 750, 1, 'Giant Stairway', 'poi'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', ST_GeogFromText('POINT(150.3124 -33.7320)'), 920, 2, 'Echo Point', 'stop')
  `;

  console.log("Seed complete: 1 user, 2 routes, 6 waypoints");
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
