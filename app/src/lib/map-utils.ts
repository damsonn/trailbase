import type { MapViewState } from "../components/map/BaseMap.js";

/**
 * Compute a map view state that fits all given points with padding.
 */
export function computeBoundsView(
  points: { lat: number; lng: number }[],
): MapViewState {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add small padding so markers aren't clipped at the edges.
  const rawLatSpan = maxLat - minLat;
  const rawLngSpan = maxLng - minLng;
  const latSpan = Math.max(rawLatSpan, 0.002);
  const lngSpan = Math.max(rawLngSpan, 0.002);

  // Use the larger span to compute zoom. The formula maps degrees-per-tile
  // at zoom 0 (360° for lng, 180° for lat) to the span we need to show.
  const zoomLng = Math.log2(360 / lngSpan);
  const zoomLat = Math.log2(180 / latSpan);
  const zoom = Math.max(1, Math.min(18, Math.min(zoomLng, zoomLat) + 0.8));

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    zoom,
  };
}
