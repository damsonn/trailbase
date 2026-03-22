import { eq, and, isNull, sql, ilike, asc, desc, SQL } from "drizzle-orm";
import { getDb, type Database } from "../db/index.js";
import { routes, waypoints } from "../db/schema.js";
import type {
  RouteListQuery,
  CreateRouteInput,
  UpdateRouteInput,
  Coordinate,
} from "@trailbase/shared";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RouteRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  activityType: "bike" | "hike" | "car";
  geometryJson: string | null;
  distanceM: string | null;
  elevationGainM: string | null;
  elevationLossM: string | null;
  metadata: unknown;
  sourceFormat: "manual" | "gpx" | "geojson";
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaypointRow {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  elevationM: string | null;
  sortOrder: number;
  name: string | null;
  type: "via" | "stop" | "poi";
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteWithWaypointRows extends RouteRow {
  waypoints: WaypointRow[];
}

export interface FindManyResult {
  rows: RouteRow[];
  total: number;
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

const sortColumns = {
  createdAt: routes.createdAt,
  updatedAt: routes.updatedAt,
  name: routes.name,
  distanceM: routes.distanceM,
} as const;

// ── Repository ───────────────────────────────────────────────────────────────

export class RouteRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  async findMany(userId: string, query: RouteListQuery): Promise<FindManyResult> {
    const conditions: SQL[] = [
      eq(routes.userId, userId),
      isNull(routes.deletedAt),
    ];

    if (query.activityType) {
      conditions.push(eq(routes.activityType, query.activityType));
    }
    if (query.search) {
      conditions.push(ilike(routes.name, `%${query.search}%`));
    }

    const where = and(...conditions)!;
    const sortCol = sortColumns[query.sortBy];
    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(routes)
        .where(where)
        .orderBy(orderFn(sortCol))
        .limit(query.perPage)
        .offset((query.page - 1) * query.perPage),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(routes)
        .where(where),
    ]);

    return {
      rows: (rows as Array<Record<string, unknown>>).map((r) => ({ ...r, geometryJson: null })) as RouteRow[],
      total: countResult[0]?.count ?? 0,
    };
  }

  async findById(id: string, userId: string): Promise<RouteWithWaypointRows | null> {
    const routeRows = await this.db.execute(sql`
      SELECT
        id, user_id as "userId", name, description,
        activity_type as "activityType",
        ST_AsGeoJSON(geometry::geometry) as "geometryJson",
        distance_m as "distanceM",
        elevation_gain_m as "elevationGainM",
        elevation_loss_m as "elevationLossM",
        metadata, source_format as "sourceFormat",
        deleted_at as "deletedAt", version,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM routes
      WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
    `);

    const rows = Array.from(routeRows) as unknown as RouteRow[];
    const route = rows[0];
    if (!route) return null;

    // Fetch waypoints with position extracted via raw SQL
    const wps = await this.db.execute(sql`
      SELECT
        id, route_id as "routeId",
        ST_Y(position::geometry) as lat,
        ST_X(position::geometry) as lng,
        elevation_m as "elevationM",
        sort_order as "sortOrder",
        name, type, created_at as "createdAt", updated_at as "updatedAt"
      FROM waypoints
      WHERE route_id = ${id}
      ORDER BY sort_order ASC
    `);

    return {
      ...route,
      waypoints: Array.from(wps) as unknown as WaypointRow[],
    };
  }

  async create(
    userId: string,
    input: CreateRouteInput,
  ): Promise<RouteRow> {
    if (input.geometry) {
      // Use raw SQL for PostGIS geometry insertion
      const wkt = `LINESTRING(${input.geometry.coordinates.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;
      const rows = await this.db.execute(sql`
        INSERT INTO routes (user_id, name, description, activity_type, geometry, distance_m, elevation_gain_m, elevation_loss_m, source_format)
        VALUES (
          ${userId}, ${input.name}, ${input.description ?? null}, ${input.activityType},
          ST_GeogFromText(${wkt}),
          ${input.distanceM ?? null}, ${input.elevationGainM ?? null}, ${input.elevationLossM ?? null},
          'manual'
        )
        RETURNING id, user_id as "userId", name, description,
          activity_type as "activityType",
          ST_AsGeoJSON(geometry::geometry) as "geometryJson",
          distance_m as "distanceM", elevation_gain_m as "elevationGainM",
          elevation_loss_m as "elevationLossM", metadata, source_format as "sourceFormat",
          deleted_at as "deletedAt", version, created_at as "createdAt", updated_at as "updatedAt"
      `);
      return (Array.from(rows) as unknown as RouteRow[])[0]!;
    }

    const [row] = await this.db
      .insert(routes)
      .values({
        userId,
        name: input.name,
        description: input.description ?? null,
        activityType: input.activityType,
        distanceM: input.distanceM?.toString() ?? null,
        elevationGainM: input.elevationGainM?.toString() ?? null,
        elevationLossM: input.elevationLossM?.toString() ?? null,
        sourceFormat: "manual",
      })
      .returning();

    return { ...(row as unknown as RouteRow), geometryJson: null };
  }

  async createWaypoints(routeId: string, coords: Coordinate[]): Promise<void> {
    if (coords.length === 0) return;

    const values = coords
      .map(
        (c, i) =>
          sql`(${routeId}, ST_GeogFromText(${`POINT(${c.lng} ${c.lat})`}), ${i}, 'via')`,
      );

    await this.db.execute(
      sql`INSERT INTO waypoints (route_id, position, sort_order, type) VALUES ${sql.join(values, sql`, `)}`,
    );
  }

  async update(
    id: string,
    userId: string,
    input: UpdateRouteInput,
  ): Promise<RouteRow | null> {
    const setClauses: Record<string, unknown> = {
      updatedAt: new Date(),
      version: sql`version + 1`,
    };

    if (input.name !== undefined) setClauses["name"] = input.name;
    if (input.description !== undefined) setClauses["description"] = input.description;
    if (input.activityType !== undefined) setClauses["activityType"] = input.activityType;
    if (input.distanceM !== undefined) setClauses["distanceM"] = input.distanceM?.toString() ?? null;
    if (input.elevationGainM !== undefined) setClauses["elevationGainM"] = input.elevationGainM?.toString() ?? null;
    if (input.elevationLossM !== undefined) setClauses["elevationLossM"] = input.elevationLossM?.toString() ?? null;

    const [row] = await this.db
      .update(routes)
      .set(setClauses)
      .where(
        and(
          eq(routes.id, id),
          eq(routes.userId, userId),
          eq(routes.version, input.version),
          isNull(routes.deletedAt),
        ),
      )
      .returning();

    if (!row) return null;

    // Update geometry separately via raw SQL if provided
    if (input.geometry !== undefined) {
      if (input.geometry) {
        const wkt = `LINESTRING(${input.geometry.coordinates.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;
        await this.db.execute(sql`UPDATE routes SET geometry = ST_GeogFromText(${wkt}) WHERE id = ${id}`);
      } else {
        await this.db.execute(sql`UPDATE routes SET geometry = NULL WHERE id = ${id}`);
      }
    }

    // Re-fetch to get geometryJson
    const result = await this.db.execute(sql`
      SELECT
        id, user_id as "userId", name, description,
        activity_type as "activityType",
        ST_AsGeoJSON(geometry::geometry) as "geometryJson",
        distance_m as "distanceM", elevation_gain_m as "elevationGainM",
        elevation_loss_m as "elevationLossM", metadata, source_format as "sourceFormat",
        deleted_at as "deletedAt", version, created_at as "createdAt", updated_at as "updatedAt"
      FROM routes WHERE id = ${id}
    `);
    return (Array.from(result) as unknown as RouteRow[])[0] ?? null;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(routes)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(routes.id, id), eq(routes.userId, userId), isNull(routes.deletedAt)),
      )
      .returning({ id: routes.id });

    return !!row;
  }

  async replaceWaypoints(routeId: string, coords: Coordinate[]): Promise<void> {
    await this.db.delete(waypoints).where(eq(waypoints.routeId, routeId));
    await this.createWaypoints(routeId, coords);
  }
}
