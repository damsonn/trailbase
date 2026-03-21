import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RouteDetailPage, computeBoundsView } from "./RouteDetailPage.js";

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
    Layer: () => React.createElement("div", { "data-testid": "map-layer" }),
    Marker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "map-marker" }, children),
    NavigationControl: () => null,
    ScaleControl: () => null,
  };
});

// Mock API
const mockFetchRoute = vi.fn();
const mockUpdateRoute = vi.fn();
const mockDeleteRoute = vi.fn();

vi.mock("../lib/api.js", () => ({
  fetchRoute: (...args: unknown[]) => mockFetchRoute(...args),
  updateRoute: (...args: unknown[]) => mockUpdateRoute(...args),
  deleteRoute: (...args: unknown[]) => mockDeleteRoute(...args),
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(msg: string, code: string, status: number) {
      super(msg);
      this.code = code;
      this.status = status;
    }
  },
}));

const MOCK_ROUTE = {
  id: "r1",
  name: "Test Route",
  description: "A test route",
  activityType: "bike",
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

  it("enters edit mode", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByLabelText("Route name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
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
    expect(markers).toHaveLength(2);
    expect(markers[0]).toHaveTextContent("1");
    expect(markers[1]).toHaveTextContent("2");
    expect(screen.getByTestId("map-source")).toBeInTheDocument();
    expect(screen.getByTestId("map-layer")).toBeInTheDocument();
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
    // Three Sisters waypoints span ~0.005° — zoom must not exceed 14
    // to ensure all markers are visible with padding
    const view = computeBoundsView([
      { lat: -33.7320, lng: 150.3124 },
      { lat: -33.7310, lng: 150.3156 },
      { lat: -33.7320, lng: 150.3124 },
    ]);
    expect(view.zoom).toBeLessThanOrEqual(14);
    expect(view.zoom).toBeGreaterThanOrEqual(8);
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
    expect(view.zoom).toBeLessThanOrEqual(16);
  });
});
