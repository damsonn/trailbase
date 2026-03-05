import { describe, it, expect } from "vitest";
import { haversineDistance, totalDistance, elevationStats } from "./distance.js";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    const p = { lat: 50.85, lng: 4.35 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it("calculates distance between Brussels and Paris (~264km)", () => {
    const brussels = { lat: 50.85, lng: 4.35 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const dist = haversineDistance(brussels, paris);
    expect(dist).toBeGreaterThan(260_000);
    expect(dist).toBeLessThan(270_000);
  });
});

describe("totalDistance", () => {
  it("sums segments", () => {
    const coords = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    const total = totalDistance(coords);
    const segment = haversineDistance(coords[0]!, coords[1]!);
    expect(total).toBeCloseTo(segment * 2, 0);
  });
});

describe("elevationStats", () => {
  it("calculates gain and loss", () => {
    const elevations = [100, 200, 150, 300];
    const stats = elevationStats(elevations);
    expect(stats.gain).toBe(250); // +100 + +150
    expect(stats.loss).toBe(50); // -50
  });
});
