import { describe, it, expect } from "vitest";
import {
  createRouteSchema,
  updateRouteSchema,
  routeListQuerySchema,
  updateWaypointsSchema,
} from "@trailbase/shared";
import { app } from "../app.js";

// ── Auth guard tests (use the real app) ──────────────────────────────────────

describe("route auth guard", () => {
  it("GET /api/routes returns 401 without auth", async () => {
    const res = await app.request("/api/routes");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/routes returns 401 without auth", async () => {
    const res = await app.request("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/routes/:id returns 401 without auth", async () => {
    const res = await app.request("/api/routes/some-id");
    expect(res.status).toBe(401);
  });

  it("PUT /api/routes/:id returns 401 without auth", async () => {
    const res = await app.request("/api/routes/some-id", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test", version: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/routes/:id returns 401 without auth", async () => {
    const res = await app.request("/api/routes/some-id", { method: "DELETE" });
    expect(res.status).toBe(401);
  });
});

// ── Validation tests (schemas) ───────────────────────────────────────────────

describe("route validation schemas", () => {
  describe("createRouteSchema", () => {
    it("accepts valid input", () => {
      const result = createRouteSchema.safeParse({
        name: "My Route",
        activityType: "bike",
        waypoints: [
          { lat: -33.85, lng: 151.21 },
          { lat: -33.89, lng: 151.27 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createRouteSchema.safeParse({
        name: "",
        activityType: "bike",
        waypoints: [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects fewer than 2 waypoints", () => {
      const result = createRouteSchema.safeParse({
        name: "Route",
        activityType: "hike",
        waypoints: [{ lat: 0, lng: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid activity type", () => {
      const result = createRouteSchema.safeParse({
        name: "Route",
        activityType: "fly",
        waypoints: [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects lat out of range", () => {
      const result = createRouteSchema.safeParse({
        name: "Route",
        activityType: "bike",
        waypoints: [
          { lat: 91, lng: 0 },
          { lat: 1, lng: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateRouteSchema", () => {
    it("requires version", () => {
      const result = updateRouteSchema.safeParse({ name: "Updated" });
      expect(result.success).toBe(false);
    });

    it("accepts partial update with version", () => {
      const result = updateRouteSchema.safeParse({ name: "Updated", version: 1 });
      expect(result.success).toBe(true);
    });

    it("allows setting description to null", () => {
      const result = updateRouteSchema.safeParse({ description: null, version: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe("routeListQuerySchema", () => {
    it("provides defaults", () => {
      const result = routeListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
      expect(result.sortBy).toBe("updatedAt");
      expect(result.sortOrder).toBe("desc");
    });

    it("coerces string numbers", () => {
      const result = routeListQuerySchema.parse({ page: "3", perPage: "10" });
      expect(result.page).toBe(3);
      expect(result.perPage).toBe(10);
    });

    it("rejects perPage > 100", () => {
      const result = routeListQuerySchema.safeParse({ perPage: "101" });
      expect(result.success).toBe(false);
    });

    it("accepts activity type filter", () => {
      const result = routeListQuerySchema.parse({ activityType: "hike" });
      expect(result.activityType).toBe("hike");
    });
  });

  describe("updateWaypointsSchema", () => {
    it("requires at least 2 waypoints", () => {
      const result = updateWaypointsSchema.safeParse({
        waypoints: [{ position: { lat: 0, lng: 0 }, sortOrder: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid waypoints", () => {
      const result = updateWaypointsSchema.safeParse({
        waypoints: [
          { position: { lat: 0, lng: 0 }, sortOrder: 0 },
          { position: { lat: 1, lng: 1 }, sortOrder: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
