import type { ElevationProvider } from "./types.js";

/**
 * Tries each provider in order. Falls back to the next if the primary
 * returns all-null results (e.g. missing elevation tiles).
 */
export class FallbackElevationAdapter implements ElevationProvider {
  id = "fallback";
  name = "Fallback";

  private providers: ElevationProvider[];

  constructor(providers: ElevationProvider[]) {
    this.providers = providers;
  }

  async getElevations(
    coordinates: [number, number][],
  ): Promise<(number | null)[]> {
    for (const provider of this.providers) {
      const results = await provider.getElevations(coordinates);
      const hasData = results.some((e) => e !== null);
      if (hasData) return results;
    }
    return coordinates.map(() => null);
  }
}
