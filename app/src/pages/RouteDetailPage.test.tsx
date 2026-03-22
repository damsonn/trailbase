import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RouteDetailPage } from "./RouteDetailPage.js";
import { computeBoundsView } from "../lib/map-utils.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

// Mock react-map-gl/maplibre — avoid WebGL in tests
vi.mock("react-map-gl/maplibre", async () => {
  const { default: React } = await import("react");
  return {
    __esModule: true,
    default: React.forwardRef(function MockMap(
      props: { children?: React.ReactNode },
      ref: React.Ref<unknown>,
    ) {
      return React.createElement(
        "div",
        { "data-testid": "map", ref },
        props.children,
      );
    }),
    Source: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "map-source" }, children),
    Layer: ({ id }: { id?: string }) =>
      React.createElement("div", { "data-testid": "map-layer", "data-layer-id": id }),
    Marker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "map-marker" }, children),
    NavigationControl: () => null,
    ScaleControl: () => null,
  };
});

// Mock API
const mockFetchRoute = vi.fn();
const mockDeleteRoute = vi.fn();

vi.mock("../lib/api.js", () => ({
  fetchRoute: (...args: unknown[]) => mockFetchRoute(...args),
  deleteRoute: (...args: unknown[]) => mockDeleteRoute(...args),
}));

// Mock geocode — default to resolving with Sydney location
const mockReverseGeocode = vi.fn().mockResolvedValue({
  city: "Sydney",
  region: "New South Wales",
  country: "Australia",
  displayName: "Sydney, NSW, Australia",
});
vi.mock("../lib/geocode.js", () => ({
  reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
}));

// Mock ElevationProfile to avoid Recharts in tests
vi.mock("../components/ElevationProfile.js", () => ({
  ElevationProfile: () => React.createElement("div", { "data-testid": "elevation-profile" }),
}));

const MOCK_ROUTE = {
  id: "r1",
  name: "Test Route",
  description: "A test route",
  activityType: "bike",
  geometry: null as { type: "LineString"; coordinates: number[][] } | null,
  distanceM: 5000,
  elevationGainM: 100,
  elevationLossM: 80,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  waypoints: [
    {
      id: "w1",
      position: { lat: -33.85, lng: 151.21 },
      elevationM: 5,
      sortOrder: 0,
      name: "Start",
      type: "stop",
    },
    {
      id: "w2",
      position: { lat: -33.89, lng: 151.27 },
      elevationM: 10,
      sortOrder: 1,
      name: "End",
      type: "stop",
    },
  ],
};

function renderPage(id = "r1") {
  return render(
    <MemoryRouter initialEntries={[`/routes/${id}`]}>
      <Routes>
        <Route path="/routes/:id" element={<RouteDetailPage />} />
        <Route path="/routes" element={<div>Routes List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    mockFetchRoute.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading route...")).toBeInTheDocument();
  });

  it("renders route details", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Route" })).toBeInTheDocument();
    });
    expect(screen.getByText("A test route")).toBeInTheDocument();
    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    expect(screen.getByText("Bike")).toBeInTheDocument();
  });

  it("renders waypoints", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Waypoints (2)")).toBeInTheDocument();
    });
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
  });

  it("shows error for missing route", async () => {
    mockFetchRoute.mockRejectedValue(new Error("Route not found"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Route not found")).toBeInTheDocument();
    });
    expect(screen.getByText("Back to routes")).toBeInTheDocument();
  });

  it("has edit and delete buttons", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("edit button links to route builder", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => screen.getByText("Edit"));
    const editLink = screen.getByText("Edit").closest("a");
    expect(editLink).toHaveAttribute("href", "/routes/r1/edit");
  });

  it("shows delete confirmation dialog", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete route?")).toBeInTheDocument();
    expect(screen.getByText(/This will permanently remove/)).toBeInTheDocument();
  });

  it("renders map with markers and route line", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument();
    });
    const markers = screen.getAllByTestId("map-marker");
    // 2 start/end markers + 2 waypoint markers = 4
    expect(markers).toHaveLength(4);
    expect(screen.getByTestId("map-source")).toBeInTheDocument();
  });

  it("does not render map when route has no waypoints", async () => {
    mockFetchRoute.mockResolvedValue({
      data: { ...MOCK_ROUTE, waypoints: [] },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Route" })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });

  it("has breadcrumb navigation", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      const breadcrumbLinks = screen.getAllByRole("link", { name: "Routes" });
      expect(breadcrumbLinks.some((el) => el.getAttribute("href") === "/routes")).toBe(true);
    });
  });

  it("renders stored geometry when available", async () => {
    const routeWithGeometry = {
      ...MOCK_ROUTE,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [151.21, -33.85],
          [151.23, -33.87],
          [151.25, -33.88],
          [151.27, -33.89],
        ],
      },
    };
    mockFetchRoute.mockResolvedValue({ data: routeWithGeometry });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument();
    });
    expect(screen.getByTestId("map-source")).toBeInTheDocument();
    expect(screen.getAllByTestId("map-layer")).toHaveLength(2);
  });

  it("falls back to waypoint straight lines when no stored geometry", async () => {
    mockFetchRoute.mockResolvedValue({ data: { ...MOCK_ROUTE, geometry: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument();
    });
    // Should still render route line from waypoints
    expect(screen.getByTestId("map-source")).toBeInTheDocument();
  });

  it("displays estimated time in stats grid", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Est. Time")).toBeInTheDocument();
    });
    // 5000m bike at 18km/h = 1000s ≈ 16m
    expect(screen.getByText("16m")).toBeInTheDocument();
  });

  it("displays dash for estimated time when distance is null", async () => {
    mockFetchRoute.mockResolvedValue({
      data: { ...MOCK_ROUTE, distanceM: null },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Est. Time")).toBeInTheDocument();
    });
    // All dashes: distance, est. time
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders directional arrows layer", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument();
    });
    const layers = screen.getAllByTestId("map-layer");
    expect(layers).toHaveLength(2);
    const arrowLayer = layers.find(
      (el) => el.getAttribute("data-layer-id") === "route-arrows-layer",
    );
    expect(arrowLayer).toBeDefined();
  });

  it("renders start and end markers", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument();
    });
    const markers = screen.getAllByTestId("map-marker");
    // 2 start/end + 2 waypoint markers
    expect(markers).toHaveLength(4);
  });

  it("displays reverse-geocoded location", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sydney, New South Wales")).toBeInTheDocument();
    });
  });

  it("hides location when geocoding fails", async () => {
    mockReverseGeocode.mockRejectedValue(new Error("Network error"));
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Route" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Sydney, New South Wales")).not.toBeInTheDocument();
  });

  it("renders elevation profile when geometry has elevation data", async () => {
    const routeWithElevation = {
      ...MOCK_ROUTE,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [151.21, -33.85, 5],
          [151.23, -33.87, 50],
          [151.25, -33.88, 25],
          [151.27, -33.89, 10],
        ],
      },
    };
    mockFetchRoute.mockResolvedValue({ data: routeWithElevation });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("elevation-profile")).toBeInTheDocument();
    });
  });

  it("hides elevation profile when geometry has no elevation", async () => {
    const routeNoElevation = {
      ...MOCK_ROUTE,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [151.21, -33.85],
          [151.27, -33.89],
        ],
      },
    };
    mockFetchRoute.mockResolvedValue({ data: routeNoElevation });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Route" })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("elevation-profile")).not.toBeInTheDocument();
  });
});

describe("computeBoundsView", () => {
  it("centers on the midpoint of all waypoints", () => {
    const view = computeBoundsView([
      { lat: -33.85, lng: 151.21 },
      { lat: -33.89, lng: 151.27 },
    ]);
    expect(view.latitude).toBeCloseTo(-33.87, 4);
    expect(view.longitude).toBeCloseTo(151.24, 4);
  });

  it("produces a zoom that fits a small route (Three Sisters seed data)", () => {
    // Three Sisters waypoints span ~0.005°
    const view = computeBoundsView([
      { lat: -33.7320, lng: 150.3124 },
      { lat: -33.7310, lng: 150.3156 },
      { lat: -33.7320, lng: 150.3124 },
    ]);
    expect(view.zoom).toBeLessThanOrEqual(18);
    expect(view.zoom).toBeGreaterThanOrEqual(12);
  });

  it("produces reasonable zoom for a city-scale route", () => {
    // Sydney Harbour Bridge to Bondi Beach (~5km)
    const view = computeBoundsView([
      { lat: -33.8523, lng: 151.2108 },
      { lat: -33.8688, lng: 151.2231 },
      { lat: -33.8915, lng: 151.2741 },
    ]);
    expect(view.zoom).toBeLessThanOrEqual(14);
    expect(view.zoom).toBeGreaterThanOrEqual(10);
  });

  it("handles a single point without crashing", () => {
    const view = computeBoundsView([{ lat: -33.85, lng: 151.21 }]);
    expect(view.latitude).toBeCloseTo(-33.85, 4);
    expect(view.longitude).toBeCloseTo(151.21, 4);
    expect(view.zoom).toBeGreaterThanOrEqual(1);
    expect(view.zoom).toBeLessThanOrEqual(18);
  });
});
