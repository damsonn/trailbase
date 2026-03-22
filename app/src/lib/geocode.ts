export interface ReverseGeocodeResult {
  city: string | null;
  region: string | null;
  country: string | null;
  displayName: string;
}

/**
 * Reverse geocode a coordinate to get city/region info.
 * Uses Nominatim (OpenStreetMap). Requires User-Agent header.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Trailbase/1.0" },
  });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const addr = data.address ?? {};
  return {
    city: addr.city ?? addr.town ?? addr.village ?? null,
    region: addr.state ?? addr.region ?? null,
    country: addr.country ?? null,
    displayName: data.display_name ?? "",
  };
}
