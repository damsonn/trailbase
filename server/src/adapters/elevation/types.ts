export interface ElevationProvider {
  id: string;
  name: string;
  /** Returns elevation in meters for each [lng, lat] coordinate. */
  getElevations(coordinates: [number, number][]): Promise<(number | null)[]>;
}
