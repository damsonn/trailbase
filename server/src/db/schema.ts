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
  boolean,
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

// ── Auth tables (managed by Better-Auth) ────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("user_email_idx").on(table.email),
]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("session_token_idx").on(table.token),
  index("session_user_id_idx").on(table.userId),
]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("account_user_id_idx").on(table.userId),
]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("verification_identifier_idx").on(table.identifier),
]);

// ── Routes ─────────────────────────────────────────────────────────────────

export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
