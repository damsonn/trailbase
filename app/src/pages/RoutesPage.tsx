import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Source, Layer } from "react-map-gl/maplibre";
import {
  fetchRoutes,
  fetchRoute,
  deleteRoute,
  type RouteItem,
  type RouteDetail,
  type PaginationMeta,
} from "../lib/api.js";
import { BaseMap } from "../components/map/BaseMap.js";
import { computeBoundsView } from "../lib/map-utils.js";
import { ElevationProfile } from "../components/ElevationProfile.js";
import {
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  formatDistance,
  formatElevation,
  formatDate,
} from "../lib/format.js";

// ── Icons (inline SVG) ──────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ── Expanded Detail Panel ────────────────────────────────────────────────────

function RouteDetailPanel({ route }: { route: RouteItem }) {
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRoute(route.id)
      .then((res) => {
        if (!cancelled) setDetail(res.data);
      })
      .catch(() => {
        // silently fail — the summary still shows
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.id]);

  const mapView = useMemo(() => {
    if (!detail?.waypoints?.length) return null;
    return computeBoundsView(detail.waypoints.map((wp) => wp.position));
  }, [detail]);

  const routeGeoJSON = useMemo(() => {
    if (!detail) return null;
    if (detail.geometry) {
      return { type: "Feature" as const, properties: {}, geometry: detail.geometry };
    }
    if (detail.waypoints.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: detail.waypoints.map((wp) => [wp.position.lng, wp.position.lat]),
      },
    };
  }, [detail]);

  const hasElevation =
    detail?.geometry?.coordinates?.some((c) => c[2] != null) ?? false;

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-neutral-100 bg-neutral-50/50 px-4 py-5 md:grid-cols-2">
      {/* Left — Route summary */}
      <div className="space-y-3">
        <h4 className="text-base font-semibold text-neutral-900">{route.name}</h4>
        {route.description && (
          <p className="text-sm text-neutral-500">{route.description}</p>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-neutral-500">Created</dt>
            <dd className="font-medium text-neutral-800">{formatDate(route.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Distance</dt>
            <dd className="font-medium text-neutral-800">{formatDistance(route.distanceM)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Elevation</dt>
            <dd className="font-medium text-neutral-800">
              +{formatElevation(route.elevationGainM)} / -{formatElevation(route.elevationLossM)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Activity</dt>
            <dd className="font-medium text-neutral-800">
              {ACTIVITY_LABELS[route.activityType] ?? route.activityType}
            </dd>
          </div>
        </dl>
        <div className="flex gap-3 pt-2">
          <Link
            to={`/routes/${route.id}`}
            className="rounded-button border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            View Full Details
          </Link>
          <Link
            to={`/routes/${route.id}/edit`}
            className="rounded-button bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Edit Route
          </Link>
        </div>
      </div>

      {/* Right — Mini map + elevation profile */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-button border border-neutral-200 bg-white">
            <span className="text-sm text-neutral-400">Loading map...</span>
          </div>
        ) : mapView ? (
          <div className="h-48 overflow-hidden rounded-button border border-neutral-200">
            <BaseMap initialViewState={mapView} cursor="grab">
              {routeGeoJSON && (
                <Source id="detail-route-line" type="geojson" data={routeGeoJSON}>
                  <Layer
                    id="detail-route-line-layer"
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
        ) : (
          <div className="flex h-48 items-center justify-center rounded-button border border-neutral-200 bg-white">
            <span className="text-sm text-neutral-400">No map data</span>
          </div>
        )}
        {hasElevation && detail?.geometry?.coordinates && (
          <div className="h-28 rounded-button border border-neutral-200 bg-white p-2">
            <ElevationProfile coordinates={detail.geometry.coordinates} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function RoutesPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, perPage: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activityType, setActivityType] = useState("");
  const [page, setPage] = useState(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRoutes({
        page,
        search: search || undefined,
        activityType: activityType || undefined,
      });
      setRoutes(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [page, search, activityType]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRoute(deleteTarget.id);
      setDeleteTarget(null);
      setDeleting(false);
      setExpandedId(null);
      await loadRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(meta.total / meta.perPage);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Routes</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            {meta.total} route{meta.total !== 1 ? "s" : ""}
          </span>
          <Link
            to="/routes/new"
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            New Route
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search routes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-button border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-primary focus:outline-none"
        />
        <select
          value={activityType}
          onChange={(e) => {
            setActivityType(e.target.value);
            setPage(1);
          }}
          aria-label="Activity type"
          className="rounded-button border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All activities</option>
          <option value="bike">Bike</option>
          <option value="hike">Hike</option>
          <option value="car">Car</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-neutral-500">Loading routes...</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : routes.length === 0 ? (
        <p className="text-neutral-500">
          {search || activityType ? "No routes match your filters." : "No routes yet. Create your first route!"}
        </p>
      ) : (
        <>
          {/* Table header */}
          <div className="mb-2 hidden items-center gap-4 px-4 text-xs font-medium uppercase tracking-wide text-neutral-400 md:flex">
            <span className="flex-1">Route</span>
            <span className="w-20 text-right">Distance</span>
            <span className="w-24 text-right">Elevation</span>
            <span className="w-20 text-center">Type</span>
            <span className="w-24 text-right">Created</span>
            <span className="w-20" />
          </div>

          <div className="space-y-2">
            {routes.map((route) => {
              const isExpanded = expandedId === route.id;

              return (
                <div
                  key={route.id}
                  className={`group overflow-hidden rounded-button border bg-white transition ${
                    isExpanded
                      ? "border-primary/30 shadow-sm"
                      : "border-neutral-200 hover:border-primary/20 hover:shadow-sm"
                  }`}
                >
                  {/* Row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Route name + description */}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/routes/${route.id}`}
                        className="truncate font-semibold text-neutral-900 hover:text-primary"
                      >
                        {route.name}
                      </Link>
                      {route.description && (
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {route.description}
                        </p>
                      )}
                    </div>

                    {/* Distance */}
                    <span className="hidden w-20 text-right text-sm text-neutral-700 md:block">
                      {formatDistance(route.distanceM)}
                    </span>

                    {/* Elevation */}
                    <span className="hidden w-24 text-right text-sm text-neutral-700 md:block">
                      {formatElevation(route.elevationGainM)} gain
                    </span>

                    {/* Activity badge */}
                    <span
                      className={`hidden w-20 text-center md:inline-block rounded-button px-2 py-0.5 text-xs font-medium ${ACTIVITY_COLORS[route.activityType] ?? ""}`}
                    >
                      {ACTIVITY_LABELS[route.activityType] ?? route.activityType}
                    </span>

                    {/* Created date */}
                    <span className="hidden w-24 text-right text-xs text-neutral-500 md:block">
                      {formatDate(route.createdAt)}
                    </span>

                    {/* Hover actions + chevron */}
                    <div className="flex w-20 items-center justify-end gap-1">
                      {/* Edit */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/routes/${route.id}/edit`);
                        }}
                        className="rounded p-1.5 text-neutral-400 opacity-0 transition hover:bg-neutral-100 hover:text-primary group-hover:opacity-100"
                        aria-label={`Edit ${route.name}`}
                        title="Edit route"
                      >
                        <PencilIcon />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(route);
                        }}
                        className="rounded p-1.5 text-neutral-400 opacity-0 transition hover:bg-error/5 hover:text-error group-hover:opacity-100"
                        aria-label={`Delete ${route.name}`}
                        title="Delete route"
                      >
                        <TrashIcon />
                      </button>
                      {/* Chevron */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : route.id)}
                        className="rounded p-1 transition hover:bg-neutral-100"
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && <RouteDetailPanel route={route} />}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-button border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-button border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-button bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">Delete route?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              This will permanently remove &ldquo;{deleteTarget.name}&rdquo;. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
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
