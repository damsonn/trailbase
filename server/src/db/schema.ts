import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const activityTypeEnum = pgEnum("activity_type", [
  "bike",
  "hike",
  "car",
]);

export const sourceFormatEnum = pgEnum("source_format", [
  "manual",
  "gpx",
  "geojson",
]);

export const waypointTypeEnum = pgEnum("waypoint_type", [
  "via",
  "stop",
  "poi",
]);

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

// ── Sessions (Better-Auth managed) ─────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_token_hash_idx").on(table.tokenHash),
]);

// ── Routes ─────────────────────────────────────────────────────────────────

export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  activityType: activityTypeEnum("activity_type").notNull(),
  // PostGIS geography column — managed via raw SQL in migration
  // Drizzle doesn't natively support PostGIS, so we use a text placeholder
  // and handle geometry via raw SQL in repositories
  geometry: text("geometry"),
  distanceM: numeric("distance_m"),
  elevationGainM: numeric("elevation_gain_m"),
  elevationLossM: numeric("elevation_loss_m"),
  metadata: jsonb("metadata"),
  sourceFormat: sourceFormatEnum("source_format").notNull().default("manual"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("routes_user_id_idx").on(table.userId),
  index("routes_activity_type_idx").on(table.activityType),
  index("routes_deleted_at_idx").on(table.deletedAt),
]);

// ── Waypoints ──────────────────────────────────────────────────────────────

export const waypoints = pgTable("waypoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  // PostGIS point — same approach as routes.geometry
  position: text("position"),
  elevationM: numeric("elevation_m"),
  sortOrder: integer("sort_order").notNull(),
  name: text("name"),
  type: waypointTypeEnum("type").notNull().default("via"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("waypoints_route_id_idx").on(table.routeId),
  index("waypoints_sort_order_idx").on(table.routeId, table.sortOrder),
]);
