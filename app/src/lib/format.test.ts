import { describe, it, expect } from "vitest";
import {
  formatDistance,
  formatElevation,
  formatDate,
  formatDuration,
  estimateTimeSeconds,
  ACTIVITY_SPEEDS,
} from "./format.js";

describe("formatDistance", () => {
  it("returns dash for null", () => {
    expect(formatDistance(null)).toBe("-");
  });

  it("formats meters below 1000", () => {
    expect(formatDistance(500)).toBe("500 m");
  });

  it("formats kilometers at 1000+", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(18000)).toBe("18.0 km");
  });
});

describe("formatElevation", () => {
  it("returns dash for null", () => {
    expect(formatElevation(null)).toBe("-");
  });

  it("rounds to nearest meter", () => {
    expect(formatElevation(123.7)).toBe("124 m");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-03-22T00:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("Mar");
  });
});

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("formats minutes only", () => {
    expect(formatDuration(300)).toBe("5m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(5400)).toBe("1h 30m");
  });

  it("formats exact hours", () => {
    expect(formatDuration(7200)).toBe("2h 0m");
  });
});

describe("estimateTimeSeconds", () => {
  it("estimates bike time (18 km/h)", () => {
    // 18 km at 18 km/h = 1 hour = 3600 seconds
    expect(estimateTimeSeconds(18000, "bike")).toBeCloseTo(3600, 0);
  });

  it("estimates hike time (4.5 km/h)", () => {
    // 4.5 km at 4.5 km/h = 1 hour
    expect(estimateTimeSeconds(4500, "hike")).toBeCloseTo(3600, 0);
  });

  it("estimates car time (60 km/h)", () => {
    // 60 km at 60 km/h = 1 hour
    expect(estimateTimeSeconds(60000, "car")).toBeCloseTo(3600, 0);
  });

  it("defaults to hike speed for unknown activity", () => {
    const result = estimateTimeSeconds(4500, "unknown");
    expect(result).toBeCloseTo(3600, 0);
  });

  it("has correct speed constants", () => {
    expect(ACTIVITY_SPEEDS.bike).toBe(18);
    expect(ACTIVITY_SPEEDS.hike).toBe(4.5);
    expect(ACTIVITY_SPEEDS.car).toBe(60);
  });
});
