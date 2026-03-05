import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(databaseUrl);

async function seed() {
  console.log("Seeding database...");

  // Create a demo user (password: "password123" hashed with bcrypt cost 12)
  const [user] = await sql`
    INSERT INTO users (id, email, password_hash)
    VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'demo@trailbase.app',
      '$2b$12$LJ3P5gF1S1HG2OQ/t5soUOLIjY/YTjE7pO2bKXHq3TGhLh.VJX2ZK'
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  if (!user) {
    console.log("Demo user already exists, skipping seed.");
    await sql.end();
    return;
  }

  const userId = user.id;

  // Sydney Harbour Bridge to Bondi Beach route
  await sql`
    INSERT INTO routes (id, user_id, name, description, activity_type, geometry, distance_m, elevation_gain_m, elevation_loss_m, source_format, metadata)
    VALUES (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      ${userId},
      'Harbour Bridge to Bondi',
      'A scenic ride from the Sydney Harbour Bridge through the city to Bondi Beach.',
      'bike',
      ST_GeogFromText('LINESTRING(151.2108 -33.8523, 151.2153 -33.8569, 151.2231 -33.8688, 151.2340 -33.8778, 151.2506 -33.8832, 151.2741 -33.8915)'),
      8500,
      120,
      95,
      'manual',
      '{"tags": ["coastal", "scenic"]}'::jsonb
    )
  `;

  // Waypoints for the route
  await sql`
    INSERT INTO waypoints (route_id, position, elevation_m, sort_order, name, type)
    VALUES
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2108 -33.8523)'), 5, 0, 'Harbour Bridge', 'stop'),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2231 -33.8688)'), 25, 1, 'Hyde Park', 'via'),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', ST_GeogFromText('POINT(151.2741 -33.8915)'), 10, 2, 'Bondi Beach', 'stop')
  `;

  // Blue Mountains hike
  await sql`
    INSERT INTO routes (id, user_id, name, description, activity_type, geometry, distance_m, elevation_gain_m, elevation_loss_m, source_format, metadata)
    VALUES (
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      ${userId},
      'Three Sisters Loop',
      'Classic Blue Mountains walk with views of the Three Sisters rock formation.',
      'hike',
      ST_GeogFromText('LINESTRING(150.3124 -33.7320, 150.3140 -33.7335, 150.3156 -33.7310, 150.3170 -33.7325, 150.3124 -33.7320)'),
      3200,
      280,
      280,
      'manual',
      '{"tags": ["mountains", "loop", "views"]}'::jsonb
    )
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
