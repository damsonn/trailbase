import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchRoute,
  updateRoute,
  deleteRoute,
  type RouteDetail,
  ApiError,
} from "../lib/api.js";

const ACTIVITY_LABELS: Record<string, string> = {
  bike: "Bike",
  hike: "Hike",
  car: "Car",
};

function formatDistance(m: number | null): string {
  if (m == null) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatElevation(m: number | null): string {
  if (m == null) return "-";
  return `${Math.round(m)} m`;
}

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  function startEdit() {
    if (!route) return;
    setEditName(route.name);
    setEditDescription(route.description ?? "");
    setEditActivity(route.activityType);
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!route || !id) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await updateRoute(id, {
        name: editName,
        description: editDescription || null,
        activityType: editActivity,
        version: route.version,
      });
      setRoute({ ...route, ...res.data });
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VERSION_CONFLICT") {
        setSaveError("This route was modified elsewhere. Please refresh and try again.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

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
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Route name"
                className="block w-full rounded-button border border-neutral-200 px-3 py-2 text-lg font-bold focus:border-primary focus:outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label="Description"
                rows={3}
                className="block w-full rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <select
                value={editActivity}
                onChange={(e) => setEditActivity(e.target.value)}
                aria-label="Activity type"
                className="rounded-button border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="bike">Bike</option>
                <option value="hike">Hike</option>
                <option value="car">Car</option>
              </select>
              {saveError && <p className="text-sm text-error">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="rounded-button bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="rounded-button border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-neutral-900">{route.name}</h1>
              {route.description && (
                <p className="mt-2 text-neutral-500">{route.description}</p>
              )}
              <span className="mt-2 inline-block rounded-button bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                {ACTIVITY_LABELS[route.activityType] ?? route.activityType}
              </span>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={startEdit}
              className="rounded-button border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-button border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error/5"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
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
      </div>

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
