import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchRoutes, type RouteItem, type PaginationMeta } from "../lib/api.js";

const ACTIVITY_LABELS: Record<string, string> = {
  bike: "Bike",
  hike: "Hike",
  car: "Car",
};

const ACTIVITY_COLORS: Record<string, string> = {
  bike: "bg-info/10 text-info",
  hike: "bg-success/10 text-success",
  car: "bg-secondary/10 text-secondary",
};

function formatDistance(m: number | null): string {
  if (m == null) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatElevation(m: number | null): string {
  if (m == null) return "-";
  return `${Math.round(m)} m`;
}

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, perPage: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activityType, setActivityType] = useState("");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.ceil(meta.total / meta.perPage);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Routes</h1>
        <span className="text-sm text-neutral-500">
          {meta.total} route{meta.total !== 1 ? "s" : ""}
        </span>
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
          <div className="space-y-3">
            {routes.map((route) => (
              <Link
                key={route.id}
                to={`/routes/${route.id}`}
                className="block rounded-button border border-neutral-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-900">{route.name}</h3>
                    {route.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                        {route.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                      <span>{formatDistance(route.distanceM)}</span>
                      <span>{formatElevation(route.elevationGainM)} gain</span>
                    </div>
                  </div>
                  <span
                    className={`ml-4 shrink-0 rounded-button px-2 py-1 text-xs font-medium ${ACTIVITY_COLORS[route.activityType] ?? ""}`}
                  >
                    {ACTIVITY_LABELS[route.activityType] ?? route.activityType}
                  </span>
                </div>
              </Link>
            ))}
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
    </div>
  );
}
