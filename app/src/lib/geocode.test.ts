import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reverseGeocode } from "./geocode.js";

describe("reverseGeocode", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls Nominatim with correct URL and headers", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { city: "Sydney", state: "New South Wales", country: "Australia" },
          display_name: "Sydney, NSW, Australia",
        }),
      ),
    );

    await reverseGeocode(-33.8688, 151.2093);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/reverse"),
      expect.objectContaining({
        headers: { "User-Agent": "Trailbase/1.0" },
      }),
    );
    const url = vi.mocked(globalThis.fetch).mock.calls[0]![0] as string;
    expect(url).toContain("lat=-33.8688");
    expect(url).toContain("lon=151.2093");
    expect(url).toContain("zoom=10");
  });

  it("parses city and region from response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { city: "Sydney", state: "New South Wales", country: "Australia" },
          display_name: "Sydney, NSW, Australia",
        }),
      ),
    );

    const result = await reverseGeocode(-33.8688, 151.2093);
    expect(result.city).toBe("Sydney");
    expect(result.region).toBe("New South Wales");
    expect(result.country).toBe("Australia");
    expect(result.displayName).toBe("Sydney, NSW, Australia");
  });

  it("falls back to town/village when city is missing", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { town: "Katoomba", state: "New South Wales" },
          display_name: "Katoomba, NSW",
        }),
      ),
    );

    const result = await reverseGeocode(-33.7, 150.3);
    expect(result.city).toBe("Katoomba");
  });

  it("returns null fields when address is missing", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ display_name: "Unknown" })),
    );

    const result = await reverseGeocode(0, 0);
    expect(result.city).toBeNull();
    expect(result.region).toBeNull();
    expect(result.country).toBeNull();
  });

  it("throws on non-OK response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("", { status: 500 }),
    );

    await expect(reverseGeocode(0, 0)).rejects.toThrow("Geocoding failed");
  });
});
