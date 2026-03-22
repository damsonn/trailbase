import type { ElevationProvider } from "./types.js";

/** Max coordinates per Open-Meteo API request (URL length limit). */
const BATCH_SIZE = 100;

export class OpenMeteoAdapter implements ElevationProvider {
  id = "open-meteo";
  name = "Open-Meteo";

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? "https://api.open-meteo.com/v1/elevation";
  }

  async getElevations(
    coordinates: [number, number][],
  ): Promise<(number | null)[]> {
    if (coordinates.length === 0) return [];

    // Process in batches to stay within URL length limits
    const results: (number | null)[] = [];

    for (let i = 0; i < coordinates.length; i += BATCH_SIZE) {
      const batch = coordinates.slice(i, i + BATCH_SIZE);
      const batchResults = await this.fetchBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async fetchBatch(
    coords: [number, number][],
  ): Promise<(number | null)[]> {
    const lats = coords.map(([, lat]) => lat).join(",");
    const lngs = coords.map(([lng]) => lng).join(",");
    const url = `${this.baseUrl}?latitude=${lats}&longitude=${lngs}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return coords.map(() => null);

      const data = (await res.json()) as { elevation: (number | null)[] };
      return data.elevation ?? coords.map(() => null);
    } catch {
      return coords.map(() => null);
    }
  }
}
