import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import {
  fetchRoute,
  deleteRoute,
  exportGpx,
  type RouteDetail,
} from "../lib/api.js";
import { BaseMap, type MapViewState } from "../components/map/BaseMap.js";
import { ElevationProfile } from "../components/ElevationProfile.js";
import { computeBoundsView } from "../lib/map-utils.js";
import {
  ACTIVITY_LABELS,
  formatDistance,
  formatElevation,
  formatDuration,
  estimateTimeSeconds,
} from "../lib/format.js";
import { reverseGeocode } from "../lib/geocode.js";

export { computeBoundsView };

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Location metadata (reverse geocoded)
  const [location, setLocation] = useState<string | null>(null);

  const initialMapView = useMemo<MapViewState | null>(() => {
    if (!route || route.waypoints.length === 0) return null;
    return computeBoundsView(
      route.waypoints.map((wp) => wp.position),
    );
  }, [route]);

  const routeGeoJSON = useMemo(() => {
    if (!route) return null;

    // Prefer stored geometry from routing engine if available
    if (route.geometry) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: route.geometry,
      };
    }

    // Fallback: straight lines between waypoints
    if (route.waypoints.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: route.waypoints.map((wp) => [
          wp.position.lng,
          wp.position.lat,
        ]),
      },
    };
  }, [route]);

  const estimatedTime = useMemo(() => {
    if (!route?.distanceM) return null;
    return estimateTimeSeconds(route.distanceM, route.activityType);
  }, [route]);

  const startEnd = useMemo(() => {
    if (!route) return null;
    if (route.geometry && route.geometry.coordinates.length >= 2) {
      const coords = route.geometry.coordinates;
      return {
        start: { lng: coords[0]![0]!, lat: coords[0]![1]! },
        end: { lng: coords[coords.length - 1]![0]!, lat: coords[coords.length - 1]![1]! },
      };
    }
    if (route.waypoints.length >= 2) {
      return {
        start: route.waypoints[0]!.position,
        end: route.waypoints[route.waypoints.length - 1]!.position,
      };
    }
    return null;
  }, [route]);

  useEffect(() => {
    if (!route || route.waypoints.length === 0) return;
    const { lat, lng } = route.waypoints[0]!.position;
    let cancelled = false;
    reverseGeocode(lat, lng)
      .then((result) => {
        if (cancelled) return;
        const parts = [result.city, result.region].filter(Boolean);
        setLocation(parts.length > 0 ? parts.join(", ") : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [route]);

  const loadRoute = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRoute(id);
      setRoute(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteRoute(id);
      navigate("/routes", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
      setShowDeleteConfirm(false);
      setDeleting(false);
    }
  }

  async function handleExport() {
    if (!id || !route) return;
    try {
      const blob = await exportGpx(id);
      const filename = route.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export GPX");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-neutral-500">Loading route...</p>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-error">{error ?? "Route not found"}</p>
        <Link to="/routes" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to routes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-neutral-500">
        <Link to="/routes" className="hover:text-primary">Routes</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800">{route.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{route.name}</h1>
          {route.description && (
            <p className="mt-2 text-neutral-500">{route.description}</p>
          )}
          <span className="mt-2 inline-block rounded-button bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
            {ACTIVITY_LABELS[route.activityType] ?? route.activityType}
          </span>
          {location && (
            <p className="mt-1 text-sm text-neutral-500">Starts in: {location}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-button border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Export GPX
          </button>
          <Link
            to={`/routes/${id}/edit`}
            className="rounded-button border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-button border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error/5"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Map */}
      {initialMapView && route.waypoints.length > 0 && (
        <div className="mb-8 h-[60vh] w-full overflow-hidden rounded-button border border-neutral-200">
          <BaseMap
            initialViewState={initialMapView}
            cursor="grab"
          >
            {/* Start/end markers */}
            {startEnd && (
              <>
                <Marker longitude={startEnd.start.lng} latitude={startEnd.start.lat} anchor="center">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow" />
                </Marker>
                <Marker longitude={startEnd.end.lng} latitude={startEnd.end.lat} anchor="center">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 shadow" />
                </Marker>
              </>
            )}

            {/* Waypoint markers — group overlapping positions */}
            {(() => {
              const groups = new Map<string, number[]>();
              route.waypoints.forEach((wp, idx) => {
                const key = `${wp.position.lat},${wp.position.lng}`;
                const g = groups.get(key);
                if (g) g.push(idx + 1);
                else groups.set(key, [idx + 1]);
              });
              return Array.from(groups.entries()).map(([key, nums]) => {
                const parts = key.split(",").map(Number);
                const lat = parts[0]!;
                const lng = parts[1]!;
                return (
                  <Marker
                    key={key}
                    longitude={lng}
                    latitude={lat}
                    anchor="center"
                  >
                    <div className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-xs font-bold text-white shadow">
                      {nums.length === 1 ? nums[0] : `${nums[0]}/${nums[nums.length - 1]}`}
                    </div>
                  </Marker>
                );
              });
            })()}

            {/* Route line */}
            {routeGeoJSON && (
              <Source id="route-line" type="geojson" data={routeGeoJSON}>
                <Layer
                  id="route-line-layer"
                  type="line"
                  paint={{
                    "line-color": "#2563eb",
                    "line-width": 3,
                    "line-opacity": 0.8,
                  }}
                />
                <Layer
                  id="route-arrows-layer"
                  type="symbol"
                  layout={{
                    "symbol-placement": "line",
                    "symbol-spacing": 100,
                    "text-field": "\u25B6",
                    "text-size": 12,
                    "text-rotation-alignment": "map",
                    "text-allow-overlap": true,
                    "text-ignore-placement": true,
                  }}
                  paint={{
                    "text-color": "#2563eb",
                    "text-opacity": 0.7,
                  }}
                />
              </Source>
            )}
          </BaseMap>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-button border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Distance</p>
          <p className="mt-1 text-lg font-semibold">{formatDistance(route.distanceM)}</p>
        </div>
        <div className="rounded-button border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Elevation Gain</p>
          <p className="mt-1 text-lg font-semibold">{formatElevation(route.elevationGainM)}</p>
        </div>
        <div className="rounded-button border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Elevation Loss</p>
          <p className="mt-1 text-lg font-semibold">{formatElevation(route.elevationLossM)}</p>
        </div>
        <div className="rounded-button border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Est. Time</p>
          <p className="mt-1 text-lg font-semibold">
            {estimatedTime != null ? formatDuration(estimatedTime) : "-"}
          </p>
        </div>
      </div>

      {/* Elevation Profile */}
      {route.geometry &&
        route.geometry.coordinates.length >= 2 &&
        route.geometry.coordinates.some((c: number[]) => c[2] != null) && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              Elevation Profile
            </h2>
            <div className="h-48 rounded-button border border-neutral-200 bg-white p-4">
              <ElevationProfile coordinates={route.geometry.coordinates} />
            </div>
          </div>
        )}

      {/* Waypoints */}
      {route.waypoints.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Waypoints ({route.waypoints.length})
          </h2>
          <div className="space-y-2">
            {route.waypoints.map((wp, i) => (
              <div
                key={wp.id}
                className="flex items-center gap-4 rounded-button border border-neutral-200 bg-white px-4 py-3 text-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="font-medium">{wp.name ?? `Waypoint ${i + 1}`}</span>
                  <span className="ml-3 text-neutral-500">
                    {wp.position.lat.toFixed(4)}, {wp.position.lng.toFixed(4)}
                  </span>
                </div>
                {wp.elevationM != null && (
                  <span className="text-neutral-500">{Math.round(wp.elevationM)} m</span>
                )}
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                  {wp.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-button bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">Delete route?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              This will permanently remove &ldquo;{route.name}&rdquo;. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-button border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-button bg-error px-4 py-1.5 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
