import { describe, it, expect } from "vitest";
import { directionsRequestSchema } from "@trailbase/shared";
import { app } from "../app.js";

// ── Auth guard tests ────────────────────────────────────────────────────────

describe("routing auth guard", () => {
  it("POST /api/routing/directions returns 401 without auth", async () => {
    const res = await app.request("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waypoints: [
          { lat: -33.8688, lng: 151.2093 },
          { lat: -33.8568, lng: 151.2153 },
        ],
        profile: "bike",
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ── Schema validation tests ─────────────────────────────────────────────────

describe("directionsRequestSchema", () => {
  it("accepts valid request with two waypoints", () => {
    const result = directionsRequestSchema.safeParse({
      waypoints: [
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8568, lng: 151.2153 },
      ],
      profile: "bike",
    });
    expect(result.success).toBe(true);
  });

  it("accepts request with options", () => {
    const result = directionsRequestSchema.safeParse({
      waypoints: [
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8568, lng: 151.2153 },
      ],
      profile: "car",
      options: { avoidHighways: true, avoidTolls: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 waypoints", () => {
    const result = directionsRequestSchema.safeParse({
      waypoints: [{ lat: -33.8688, lng: 151.2093 }],
      profile: "bike",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid profile", () => {
    const result = directionsRequestSchema.safeParse({
      waypoints: [
        { lat: -33.8688, lng: 151.2093 },
        { lat: -33.8568, lng: 151.2153 },
      ],
      profile: "helicopter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    const result = directionsRequestSchema.safeParse({
      waypoints: [
        { lat: 91, lng: 151.2093 },
        { lat: -33.8568, lng: 151.2153 },
      ],
      profile: "hike",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all three profiles", () => {
    for (const profile of ["bike", "hike", "car"]) {
      const result = directionsRequestSchema.safeParse({
        waypoints: [
          { lat: -33.8688, lng: 151.2093 },
          { lat: -33.8568, lng: 151.2153 },
        ],
        profile,
      });
      expect(result.success).toBe(true);
    }
  });
});
