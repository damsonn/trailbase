import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouteBuilderPage } from "./RouteBuilderPage.js";
import { createRoute, fetchDirections } from "../lib/api.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

// Mock API
vi.mock("../lib/api.js", () => ({
  createRoute: vi.fn(),
  fetchDirections: vi.fn(),
}));

// Mock react-map-gl/maplibre — avoid WebGL in tests
// The mock Map forwards onClick so tests can simulate map clicks
vi.mock("react-map-gl/maplibre", async () => {
  const { default: React } = await import("react");
  return {
    __esModule: true,
    default: React.forwardRef(function MockMap(
      props: { children?: React.ReactNode; onClick?: (e: unknown) => void },
      ref: React.Ref<unknown>,
    ) {
      return React.createElement(
        "div",
        {
          "data-testid": "map",
          ref,
          onClick: () =>
            props.onClick?.({
              lngLat: { lat: -33.87 + Math.random() * 0.01, lng: 151.21 },
              preventDefault: () => {},
            }),
        },
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

function renderPage() {
  return render(
    <MemoryRouter>
      <RouteBuilderPage />
    </MemoryRouter>,
  );
}

describe("RouteBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page with form fields", () => {
    renderPage();
    expect(screen.getByText("New Route")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My route")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional description...")).toBeInTheDocument();
  });

  it("renders activity type buttons", () => {
    renderPage();
    expect(screen.getByText("Bike")).toBeInTheDocument();
    expect(screen.getByText("Hike")).toBeInTheDocument();
    expect(screen.getByText("Car")).toBeInTheDocument();
  });

  it("renders routing method buttons", () => {
    renderPage();
    expect(screen.getByText("Straight line")).toBeInTheDocument();
    expect(screen.getByText("Snap to road")).toBeInTheDocument();
  });

  it("shows instruction text when no waypoints", () => {
    renderPage();
    expect(
      screen.getByText("Click on the map to place waypoints. At least 2 are required."),
    ).toBeInTheDocument();
  });

  it("renders the map", () => {
    renderPage();
    expect(screen.getByTestId("map")).toBeInTheDocument();
  });

  it("shows save button disabled when no name or waypoints", () => {
    renderPage();
    const saveButton = screen.getByText("Save Route");
    expect(saveButton).toBeDisabled();
  });

  it("shows distance as 0 m initially", () => {
    renderPage();
    expect(screen.getByText("0 m")).toBeInTheDocument();
  });

  it("shows waypoint count as 0", () => {
    renderPage();
    // "Waypoints" label and "0" value
    expect(screen.getByText("Waypoints")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("displays routing error when fetchDirections fails", async () => {
    const mockFetchDirections = vi.mocked(fetchDirections);
    mockFetchDirections.mockRejectedValue(
      new Error("Routing service unavailable (http://localhost:8002). Is Valhalla running?"),
    );

    renderPage();

    // Switch to snap-to-road mode first
    fireEvent.click(screen.getByText("Snap to road"));

    // Click the map twice to add 2 waypoints (triggers fetchRoute)
    const map = screen.getByTestId("map");
    fireEvent.click(map);
    fireEvent.click(map);

    // The error message should appear
    await waitFor(() => {
      expect(
        screen.getByText(
          "Routing service unavailable (http://localhost:8002). Is Valhalla running?",
        ),
      ).toBeInTheDocument();
    });
  });

  it("sends geometry when saving in snap-to-road mode", async () => {
    const mockGeometry = {
      type: "LineString" as const,
      coordinates: [
        [151.21, -33.85],
        [151.23, -33.87],
        [151.27, -33.89],
      ],
    };
    const mockRouteResult = {
      geometry: mockGeometry,
      distanceM: 5432,
      elevationGainM: 120,
      elevationLossM: 95,
      segments: [],
    };

    const mockFetchDirections = vi.mocked(fetchDirections);
    mockFetchDirections.mockResolvedValue({ data: mockRouteResult });

    const mockCreateRoute = vi.mocked(createRoute);
    mockCreateRoute.mockResolvedValue({ data: { id: "new-route-id" } as never });

    renderPage();

    // Switch to snap-to-road mode
    fireEvent.click(screen.getByText("Snap to road"));

    // Add waypoints
    const map = screen.getByTestId("map");
    fireEvent.click(map);
    fireEvent.click(map);

    // Wait for routing to complete
    await waitFor(() => {
      expect(mockFetchDirections).toHaveBeenCalled();
    });

    // Fill in name
    fireEvent.change(screen.getByPlaceholderText("My route"), {
      target: { value: "Test Route" },
    });

    // Save
    fireEvent.click(screen.getByText("Save Route"));

    await waitFor(() => {
      expect(mockCreateRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Route",
          geometry: mockGeometry,
          distanceM: 5432,
          elevationGainM: 120,
          elevationLossM: 95,
        }),
      );
    });
  });

  it("does not send geometry when saving in point-to-point mode", async () => {
    const mockCreateRoute = vi.mocked(createRoute);
    mockCreateRoute.mockResolvedValue({ data: { id: "new-route-id" } as never });

    renderPage();

    // Add waypoints (default is point-to-point)
    const map = screen.getByTestId("map");
    fireEvent.click(map);
    fireEvent.click(map);

    // Fill in name
    fireEvent.change(screen.getByPlaceholderText("My route"), {
      target: { value: "Simple Route" },
    });

    // Save
    fireEvent.click(screen.getByText("Save Route"));

    await waitFor(() => {
      expect(mockCreateRoute).toHaveBeenCalled();
    });

    const callArg = mockCreateRoute.mock.calls[0]![0];
    expect(callArg.geometry).toBeUndefined();
    expect(callArg.distanceM).toBeUndefined();
  });
});
