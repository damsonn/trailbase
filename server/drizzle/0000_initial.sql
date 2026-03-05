-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE "activity_type" AS ENUM ('bike', 'hike', 'car');
CREATE TYPE "source_format" AS ENUM ('manual', 'gpx', 'geojson');
CREATE TYPE "waypoint_type" AS ENUM ('via', 'stop', 'poi');

-- Users
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");

-- Sessions (Better-Auth managed)
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_token_hash_idx" ON "sessions" ("token_hash");

-- Routes
CREATE TABLE "routes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "activity_type" activity_type NOT NULL,
  "geometry" geography(LineString, 4326),
  "distance_m" numeric,
  "elevation_gain_m" numeric,
  "elevation_loss_m" numeric,
  "metadata" jsonb,
  "source_format" source_format NOT NULL DEFAULT 'manual',
  "deleted_at" timestamptz,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "routes_user_id_idx" ON "routes" ("user_id");
CREATE INDEX "routes_activity_type_idx" ON "routes" ("activity_type");
CREATE INDEX "routes_deleted_at_idx" ON "routes" ("deleted_at");
CREATE INDEX "routes_geometry_idx" ON "routes" USING GIST ("geometry");

-- Waypoints
CREATE TABLE "waypoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "route_id" uuid NOT NULL REFERENCES "routes" ("id") ON DELETE CASCADE,
  "position" geography(Point, 4326),
  "elevation_m" numeric,
  "sort_order" integer NOT NULL,
  "name" text,
  "type" waypoint_type NOT NULL DEFAULT 'via',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "waypoints_route_id_idx" ON "waypoints" ("route_id");
CREATE INDEX "waypoints_sort_order_idx" ON "waypoints" ("route_id", "sort_order");
CREATE INDEX "waypoints_position_idx" ON "waypoints" USING GIST ("position");
