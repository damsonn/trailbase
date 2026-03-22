import type { ElevationProvider } from "./types.js";

export class ValhallaElevationAdapter implements ElevationProvider {
  id = "valhalla";
  name = "Valhalla Height";

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env["VALHALLA_URL"] ?? "http://localhost:8002";
  }

  async getElevations(
    coordinates: [number, number][],
  ): Promise<(number | null)[]> {
    if (coordinates.length === 0) return [];

    const shape = coordinates.map(([lng, lat]) => ({ lat, lon: lng }));

    try {
      const res = await fetch(`${this.baseUrl}/height`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: false, shape }),
      });

      if (!res.ok) return coordinates.map(() => null);

      const data = (await res.json()) as { height: (number | null)[] };
      return data.height ?? coordinates.map(() => null);
    } catch {
      return coordinates.map(() => null);
    }
  }
}
