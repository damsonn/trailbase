import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useUndoRedo } from "../hooks/useUndoRedo.js";
import { useNavigate, useParams } from "react-router-dom";
import { Source, Layer, Marker, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { BaseMap, type MapViewState } from "../components/map/BaseMap.js";
import { ElevationProfile } from "../components/ElevationProfile.js";
import {
  createRoute,
  updateRoute,
  fetchRoute,
  fetchDirections,
  ApiError,
  type DirectionsResult,
} from "../lib/api.js";
import { computeBoundsView } from "../lib/map-utils.js";
import { formatDuration } from "../lib/format.js";
import type { ActivityType } from "@trailbase/shared";

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
}

type RoutingMethod = "point-to-point" | "snap-to-road";

const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "bike", label: "Bike" },
  { value: "hike", label: "Hike" },
  { value: "car", label: "Car" },
];

let waypointIdCounter = 0;
function nextWaypointId(): string {
  return `wp-${++waypointIdCounter}`;
}

export function RouteBuilderPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("hike");
  const [routingMethod, setRoutingMethod] = useState<RoutingMethod>("point-to-point");

  // Edit mode state
  const [routeVersion, setRouteVersion] = useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const skipNextRouteRef = useRef(false);

  // Map state
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 133.7751,
    latitude: -25.2744,
    zoom: 4,
  });

  // Waypoints with undo/redo
  const {
    state: waypoints,
    set: setWaypoints,
    undo: undoWaypoints,
    redo: redoWaypoints,
    reset: resetWaypoints,
    canUndo,
    canRedo,
  } = useUndoRedo<Waypoint[]>([]);

  // Routing state
  const [routeResult, setRouteResult] = useState<DirectionsResult | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing route in edit mode
  useEffect(() => {
    if (!editId) return;

    let cancelled = false;
    setIsLoadingRoute(true);
    setLoadError(null);

    fetchRoute(editId)
      .then((res) => {
        if (cancelled) return;
        const route = res.data;

        setName(route.name);
        setDescription(route.description ?? "");
        setActivityType(route.activityType as ActivityType);
        setRouteVersion(route.version);

        // Convert API waypoints to local format
        const localWaypoints: Waypoint[] = route.waypoints
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((wp) => ({
            id: nextWaypointId(),
            lat: wp.position.lat,
            lng: wp.position.lng,
          }));

        // If route has stored geometry, it was snap-to-road
        if (route.geometry) {
          setRoutingMethod("snap-to-road");
          setRouteResult({
            geometry: route.geometry,
            distanceM: route.distanceM ?? 0,
            elevationGainM: route.elevationGainM ?? 0,
            elevationLossM: route.elevationLossM ?? 0,
            segments: [],
          });
        }

        // Fit map to existing waypoints
        if (localWaypoints.length > 0) {
          setViewState(computeBoundsView(localWaypoints));
        }

        // Skip the auto-routing effect that would fire from resetWaypoints
        skipNextRouteRef.current = true;
        resetWaypoints(localWaypoints);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load route");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoute(false);
      });

    return () => { cancelled = true; };
  }, [editId, resetWaypoints]);

  // Build GeoJSON for the route line
  const routeGeoJSON = useMemo(() => {
    if (routeResult) {
      return {
        type: "Feature" as const,
        geometry: routeResult.geometry,
        properties: {},
      };
    }

    // Point-to-point: straight lines between waypoints
    if (waypoints.length >= 2) {
      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
        },
        properties: {},
      };
    }

    return null;
  }, [waypoints, routeResult]);

  // Calculate distance from route result or straight-line
  const totalDistanceM = useMemo(() => {
    if (routeResult) return routeResult.distanceM;

    if (waypoints.length < 2) return 0;

    // Haversine for straight-line distance
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1]!;
      const b = waypoints[i]!;
      const R = 6_371_000;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const sinDLat = Math.sin(dLat / 2);
      const sinDLng = Math.sin(dLng / 2);
      const h =
        sinDLat * sinDLat +
        Math.cos((a.lat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          sinDLng * sinDLng;
      total += 2 * R * Math.asin(Math.sqrt(h));
    }
    return total;
  }, [waypoints, routeResult]);

  // Fetch directions when waypoints change in snap-to-road mode
  const fetchRouteDirections = useCallback(
    async (wps: Waypoint[]) => {
      if (routingMethod !== "snap-to-road" || wps.length < 2) {
        setRouteResult(null);
        setRoutingError(null);
        return;
      }

      setIsRouting(true);
      setRoutingError(null);
      try {
        const res = await fetchDirections({
          waypoints: wps.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          profile: activityType,
        });
        setRouteResult(res.data);
      } catch (err) {
        setRoutingError(err instanceof Error ? err.message : "Routing failed");
        setRouteResult(null);
      } finally {
        setIsRouting(false);
      }
    },
    [routingMethod, activityType],
  );

  // Handle map click — add waypoint
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const newWp: Waypoint = {
        id: nextWaypointId(),
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };
      setWaypoints([...waypoints, newWp]);
    },
    [waypoints, setWaypoints],
  );

  // Remove waypoint
  const removeWaypoint = useCallback(
    (id: string) => {
      setWaypoints(waypoints.filter((wp) => wp.id !== id));
    },
    [waypoints, setWaypoints],
  );

  // Clear all waypoints
  const clearWaypoints = useCallback(() => {
    resetWaypoints([]);
    setRouteResult(null);
    setRoutingError(null);
  }, [resetWaypoints]);

  // Re-fetch route when waypoints change (handles undo/redo too)
  useEffect(() => {
    if (skipNextRouteRef.current) {
      skipNextRouteRef.current = false;
      return;
    }
    fetchRouteDirections(waypoints);
  }, [waypoints]);

  // Drag waypoint on map
  const handleMarkerDrag = useCallback(
    (id: string, lat: number, lng: number) => {
      setWaypoints(
        waypoints.map((wp) => (wp.id === id ? { ...wp, lat, lng } : wp)),
      );
    },
    [waypoints, setWaypoints],
  );

  // Move waypoint up in list
  const moveWaypointUp = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      const updated = [...waypoints];
      [updated[idx - 1], updated[idx]] = [updated[idx]!, updated[idx - 1]!];
      setWaypoints(updated);
    },
    [waypoints, setWaypoints],
  );

  // Move waypoint down in list
  const moveWaypointDown = useCallback(
    (idx: number) => {
      if (idx >= waypoints.length - 1) return;
      const updated = [...waypoints];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1]!, updated[idx]!];
      setWaypoints(updated);
    },
    [waypoints, setWaypoints],
  );

  // Handle activity type change — re-route if in snap-to-road mode
  const handleActivityChange = useCallback(
    (newType: ActivityType) => {
      setActivityType(newType);
      if (routingMethod === "snap-to-road" && waypoints.length >= 2) {
        // Need to re-fetch with new activity type, but fetchRouteDirections uses current activityType
        // So we set it and trigger a re-fetch manually
        setRouteResult(null);
        setTimeout(() => {
          // Let state update, then re-fetch
          setIsRouting(true);
          fetchDirections({
            waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
            profile: newType,
          })
            .then((res) => setRouteResult(res.data))
            .catch((err) =>
              setRoutingError(err instanceof Error ? err.message : "Routing failed"),
            )
            .finally(() => setIsRouting(false));
        }, 0);
      }
    },
    [routingMethod, waypoints],
  );

  // Handle routing method change
  const handleRoutingMethodChange = useCallback(
    (method: RoutingMethod) => {
      setRoutingMethod(method);
      if (method === "snap-to-road" && waypoints.length >= 2) {
        setIsRouting(true);
        fetchDirections({
          waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          profile: activityType,
        })
          .then((res) => setRouteResult(res.data))
          .catch((err) =>
            setRoutingError(err instanceof Error ? err.message : "Routing failed"),
          )
          .finally(() => setIsRouting(false));
      } else {
        setRouteResult(null);
        setRoutingError(null);
      }
    },
    [waypoints, activityType],
  );

  // Save route (create or update)
  const handleSave = useCallback(async () => {
    if (!name.trim() || waypoints.length < 2) return;

    setIsSaving(true);
    setSaveError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      activityType,
      waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
      ...(routeResult && {
        geometry: routeResult.geometry,
        distanceM: routeResult.distanceM,
        elevationGainM: routeResult.elevationGainM,
        elevationLossM: routeResult.elevationLossM,
      }),
    };

    try {
      if (isEditMode && editId) {
        await updateRoute(editId, { ...payload, version: routeVersion });
        navigate(`/routes/${editId}`);
      } else {
        const res = await createRoute(payload);
        navigate(`/routes/${res.data.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "VERSION_CONFLICT") {
        setSaveError("This route was modified elsewhere. Please refresh and try again.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Failed to save route");
      }
    } finally {
      setIsSaving(false);
    }
  }, [name, description, activityType, waypoints, routeResult, navigate, isEditMode, editId, routeVersion]);

  const canSave = name.trim().length > 0 && waypoints.length >= 2 && !isSaving;

  if (isLoadingRoute) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <p className="text-neutral-500">Loading route...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
        <p className="text-error">{loadError}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="flex w-full flex-col border-b border-neutral-200 bg-white lg:w-80 lg:border-b-0 lg:border-r">
        <div className="border-b border-neutral-200 p-4">
          <h1 className="text-lg font-bold text-neutral-900">
            {isEditMode ? "Edit Route" : "New Route"}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Route name */}
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My route"
            className="mb-4 w-full rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />

          {/* Description */}
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="mb-4 w-full resize-none rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />

          {/* Activity type */}
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Activity
          </label>
          <div className="mb-4 flex gap-1">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleActivityChange(opt.value)}
                className={`flex-1 rounded-button px-3 py-1.5 text-sm font-medium transition ${
                  activityType === opt.value
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Routing method */}
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Routing
          </label>
          <div className="mb-4 flex gap-1">
            <button
              onClick={() => handleRoutingMethodChange("point-to-point")}
              className={`flex-1 rounded-button px-3 py-1.5 text-xs font-medium transition ${
                routingMethod === "point-to-point"
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Straight line
            </button>
            <button
              onClick={() => handleRoutingMethodChange("snap-to-road")}
              className={`flex-1 rounded-button px-3 py-1.5 text-xs font-medium transition ${
                routingMethod === "snap-to-road"
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Snap to road
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4 rounded-button bg-neutral-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Distance</span>
              <span className="font-medium text-neutral-900">
                {totalDistanceM >= 1000
                  ? `${(totalDistanceM / 1000).toFixed(1)} km`
                  : `${Math.round(totalDistanceM)} m`}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Waypoints</span>
              <span className="font-medium text-neutral-900">{waypoints.length}</span>
            </div>
            {routeResult?.durationS != null && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-neutral-500">Est. time</span>
                <span className="font-medium text-neutral-900">
                  {formatDuration(routeResult.durationS)}
                </span>
              </div>
            )}
          </div>

          {/* Waypoint list */}
          {waypoints.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Waypoints</span>
                <button
                  onClick={clearWaypoints}
                  className="text-xs text-error hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1">
                {waypoints.map((wp, idx) => (
                  <div
                    key={wp.id}
                    className="flex items-center gap-1 rounded bg-neutral-50 px-2 py-1.5 text-xs"
                  >
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveWaypointUp(idx)}
                        disabled={idx === 0}
                        className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        aria-label={`Move waypoint ${idx + 1} up`}
                      >
                        &#9650;
                      </button>
                      <button
                        onClick={() => moveWaypointDown(idx)}
                        disabled={idx === waypoints.length - 1}
                        className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        aria-label={`Move waypoint ${idx + 1} down`}
                      >
                        &#9660;
                      </button>
                    </div>
                    <span className="flex-1 text-neutral-600">
                      {idx + 1}. {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                    </span>
                    <button
                      onClick={() => removeWaypoint(wp.id)}
                      className="text-neutral-400 hover:text-error"
                      aria-label={`Remove waypoint ${idx + 1}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Undo/Redo */}
          {(canUndo || canRedo) && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={undoWaypoints}
                disabled={!canUndo}
                className="flex-1 rounded-button border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30"
              >
                Undo
              </button>
              <button
                onClick={redoWaypoints}
                disabled={!canRedo}
                className="flex-1 rounded-button border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30"
              >
                Redo
              </button>
            </div>
          )}

          {/* Routing status */}
          {isRouting && (
            <p className="mb-4 text-sm text-neutral-500">Computing route...</p>
          )}
          {routingError && (
            <p className="mb-4 text-sm text-error">{routingError}</p>
          )}
          {saveError && (
            <p className="mb-4 text-sm text-error">{saveError}</p>
          )}

          {/* Instructions */}
          {waypoints.length === 0 && (
            <p className="text-sm text-neutral-500">
              Click on the map to place waypoints. At least 2 are required.
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="border-t border-neutral-200 p-4">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-button bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? "Saving..."
              : isEditMode
                ? "Update Route"
                : "Save Route"}
          </button>
        </div>
      </div>

      {/* Map + Elevation */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1">
        <BaseMap
          viewState={viewState}
          onMove={setViewState}
          onClick={handleMapClick}
        >
          {/* Waypoint markers */}
          {waypoints.map((wp, idx) => (
            <Marker
              key={wp.id}
              longitude={wp.lng}
              latitude={wp.lat}
              anchor="center"
              draggable
              onDragEnd={(e) =>
                handleMarkerDrag(wp.id, e.lngLat.lat, e.lngLat.lng)
              }
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white shadow"
                style={{ cursor: "grab" }}
              >
                {idx + 1}
              </div>
            </Marker>
          ))}

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
            </Source>
          )}
        </BaseMap>
        </div>

        {/* Elevation profile */}
        {routeResult && routeResult.geometry.coordinates.length >= 2 && (
          <div className="h-36 border-t border-neutral-200 bg-white px-2 py-1">
            <ElevationProfile coordinates={routeResult.geometry.coordinates} />
          </div>
        )}
      </div>
    </div>
  );
}

