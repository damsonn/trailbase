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
  it("calculates gain and loss with default threshold", () => {
    // Large changes exceed threshold (4m), so they are counted
    const elevations = [100, 200, 150, 300];
    const stats = elevationStats(elevations);
    expect(stats.gain).toBe(250); // +100 + +150
    expect(stats.loss).toBe(50); // -50
  });

  it("filters out noise below threshold", () => {
    // Small fluctuations (±2m) should be ignored
    const elevations = [100, 102, 100, 101, 99, 100];
    const stats = elevationStats(elevations);
    expect(stats.gain).toBe(0);
    expect(stats.loss).toBe(0);
  });

  it("accumulates change only when threshold exceeded", () => {
    // ref=100, 103 is +3 (below 4m threshold, ignored),
    // then 105 is +5 from ref=100 (exceeds threshold → gain=5, ref=105)
    const elevations = [100, 103, 105];
    const stats = elevationStats(elevations);
    expect(stats.gain).toBe(5);
    expect(stats.loss).toBe(0);
  });

  it("respects custom threshold", () => {
    const elevations = [100, 102, 100, 101, 99, 100];
    // With threshold=0, every change counts (naive mode)
    // Deltas: +2, -2, +1, -2, +1 → gain = 2+1+1 = 4, loss = 2+2 = 4
    const stats = elevationStats(elevations, 0);
    expect(stats.gain).toBe(4);
    expect(stats.loss).toBe(4);
  });
});
