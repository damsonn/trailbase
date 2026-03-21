import { describe, it, expect, vi, afterEach } from "vitest";
import { directionsRequestSchema } from "@trailbase/shared";
import { app } from "../app.js";
import { ValhallaAdapter } from "../adapters/routing/valhalla-adapter.js";

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

// ── Valhalla adapter error handling ────────────────────────────────────────

describe("ValhallaAdapter error handling", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws descriptive error when Valhalla is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const adapter = new ValhallaAdapter("http://localhost:9999");

    await expect(
      adapter.getRoute({
        waypoints: [
          { lat: -33.8688, lng: 151.2093 },
          { lat: -33.8568, lng: 151.2153 },
        ],
        profile: "bike",
      }),
    ).rejects.toThrow("Routing service unavailable (http://localhost:9999). Is Valhalla running?");
  });

  it("throws on non-ok HTTP response from Valhalla", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const adapter = new ValhallaAdapter("http://localhost:9999");

    await expect(
      adapter.getRoute({
        waypoints: [
          { lat: -33.8688, lng: 151.2093 },
          { lat: -33.8568, lng: 151.2153 },
        ],
        profile: "bike",
      }),
    ).rejects.toThrow("Valhalla error (500)");
  });
});
