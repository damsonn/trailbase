const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? res.statusText,
      body?.error?.code ?? "UNKNOWN",
      res.status,
      body?.error?.details,
    );
  }

  return body;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Route API ────────────────────────────────────────────────────────────────

export interface RouteListParams {
  page?: number;
  perPage?: number;
  activityType?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}

export async function fetchRoutes(params: RouteListParams = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return request<{ data: RouteItem[]; meta: PaginationMeta }>(
    `/routes${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchRoute(id: string) {
  return request<{ data: RouteDetail }>(`/routes/${id}`);
}

export async function createRoute(input: {
  name: string;
  description?: string;
  activityType: string;
  waypoints: { lat: number; lng: number }[];
}) {
  return request<{ data: RouteItem }>("/routes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRoute(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    activityType?: string;
    version: number;
  },
) {
  return request<{ data: RouteItem }>(`/routes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteRoute(id: string) {
  return request<{ data: { id: string } }>(`/routes/${id}`, {
    method: "DELETE",
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RouteItem {
  id: string;
  name: string;
  description: string | null;
  activityType: string;
  distanceM: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WaypointItem {
  id: string;
  position: { lat: number; lng: number };
  elevationM: number | null;
  sortOrder: number;
  name: string | null;
  type: string;
}

export interface RouteDetail extends RouteItem {
  waypoints: WaypointItem[];
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
}
