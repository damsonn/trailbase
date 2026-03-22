import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RoutesPage } from "./RoutesPage.js";
import type { RouteItem } from "../lib/api.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

// Mock API
const mockFetchRoutes = vi.fn();
const mockFetchRoute = vi.fn();
const mockDeleteRoute = vi.fn();
vi.mock("../lib/api.js", () => ({
  fetchRoutes: (...args: unknown[]) => mockFetchRoutes(...args),
  fetchRoute: (...args: unknown[]) => mockFetchRoute(...args),
  deleteRoute: (...args: unknown[]) => mockDeleteRoute(...args),
}));

// Mock map components (WebGL not available in jsdom)
vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Source: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: () => <div />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/map/BaseMap.js", () => ({
  BaseMap: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="base-map">{children}</div>
  ),
}));

vi.mock("../components/ElevationProfile.js", () => ({
  ElevationProfile: () => <div data-testid="elevation-profile" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const SAMPLE_ROUTE: RouteItem = {
  id: "r1",
  name: "Harbour Bridge to Bondi",
  description: "Scenic coastal ride",
  activityType: "bike",
  distanceM: 8500,
  elevationGainM: 120,
  elevationLossM: 95,
  version: 1,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const SAMPLE_ROUTE_2: RouteItem = {
  id: "r2",
  name: "Three Sisters Loop",
  description: null,
  activityType: "hike",
  distanceM: 5200,
  elevationGainM: 340,
  elevationLossM: 340,
  version: 1,
  createdAt: "2026-02-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RoutesPage />
    </MemoryRouter>,
  );
}

describe("RoutesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetchRoutes.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading routes...")).toBeInTheDocument();
  });

  it("shows empty state when no routes", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 20, total: 0 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No routes yet. Create your first route!")).toBeInTheDocument();
    });
  });

  it("renders route list with columns", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });
    expect(screen.getByText("8.5 km")).toBeInTheDocument();
    expect(screen.getByText("120 m")).toBeInTheDocument();
    expect(screen.getByText("1 route")).toBeInTheDocument();
    // Activity badge
    expect(screen.getAllByText("Bike").length).toBeGreaterThanOrEqual(1);
    // Route name links directly to detail page
    const nameLink = screen.getByText("Harbour Bridge to Bondi").closest("a");
    expect(nameLink).toHaveAttribute("href", "/routes/r1");
  });

  it("shows error state", async () => {
    mockFetchRoutes.mockRejectedValue(new Error("Network error"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("has search input and activity filter", async () => {
    mockFetchRoutes.mockResolvedValue({ data: [], meta: { page: 1, perPage: 20, total: 0 } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search routes...")).toBeInTheDocument();
    });
    expect(screen.getByRole("combobox", { name: "Activity type" })).toBeInTheDocument();
  });

  it("shows filtered empty state", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 20, total: 0 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No routes yet. Create your first route!")).toBeInTheDocument();
    });
  });

  // ── Expand / Collapse ──────────────────────────────────────────────────────

  it("expands row detail on chevron click", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    mockFetchRoute.mockResolvedValue({
      data: {
        ...SAMPLE_ROUTE,
        geometry: null,
        waypoints: [],
      },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    const expandBtn = screen.getByRole("button", { name: "Expand details" });
    fireEvent.click(expandBtn);

    // Detail panel should show summary info
    await waitFor(() => {
      expect(screen.getByText("View Full Details")).toBeInTheDocument();
    });
    expect(screen.getByText("Edit Route")).toBeInTheDocument();
    expect(mockFetchRoute).toHaveBeenCalledWith("r1");
  });

  it("collapses expanded row on second chevron click", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    mockFetchRoute.mockResolvedValue({
      data: { ...SAMPLE_ROUTE, geometry: null, waypoints: [] },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    const expandBtn = screen.getByRole("button", { name: "Expand details" });
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText("View Full Details")).toBeInTheDocument();
    });

    const collapseBtn = screen.getByRole("button", { name: "Collapse details" });
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText("View Full Details")).not.toBeInTheDocument();
    });
  });

  it("only one row expanded at a time", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE, SAMPLE_ROUTE_2],
      meta: { page: 1, perPage: 20, total: 2 },
    });
    mockFetchRoute.mockResolvedValue({
      data: { ...SAMPLE_ROUTE, geometry: null, waypoints: [] },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    const expandBtns = screen.getAllByRole("button", { name: "Expand details" });
    expect(expandBtns).toHaveLength(2);

    // Expand first
    fireEvent.click(expandBtns[0]!);
    await waitFor(() => {
      expect(screen.getByText("View Full Details")).toBeInTheDocument();
    });

    // Expand second — first should collapse
    mockFetchRoute.mockResolvedValue({
      data: { ...SAMPLE_ROUTE_2, geometry: null, waypoints: [] },
    });
    const secondExpand = screen.getAllByRole("button", { name: "Expand details" });
    // The first row now shows "Collapse details", second still shows "Expand details"
    fireEvent.click(secondExpand[0]!);

    await waitFor(() => {
      // Only one detail panel visible
      const detailLinks = screen.getAllByText("View Full Details");
      expect(detailLinks).toHaveLength(1);
    });
  });

  it("shows mini map when route has waypoints", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    mockFetchRoute.mockResolvedValue({
      data: {
        ...SAMPLE_ROUTE,
        geometry: {
          type: "LineString",
          coordinates: [
            [151.21, -33.85, 10],
            [151.27, -33.89, 45],
          ],
        },
        waypoints: [
          { id: "w1", position: { lat: -33.85, lng: 151.21 }, elevationM: 10, sortOrder: 0, name: null, type: "start" },
          { id: "w2", position: { lat: -33.89, lng: 151.27 }, elevationM: 45, sortOrder: 1, name: null, type: "end" },
        ],
      },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));

    await waitFor(() => {
      expect(screen.getByTestId("base-map")).toBeInTheDocument();
    });
    expect(screen.getByTestId("elevation-profile")).toBeInTheDocument();
  });

  // ── Hover Actions ──────────────────────────────────────────────────────────

  it("edit button navigates to builder", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: `Edit ${SAMPLE_ROUTE.name}` });
    fireEvent.click(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/routes/r1/edit");
  });

  it("delete button opens confirmation dialog", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: `Delete ${SAMPLE_ROUTE.name}` });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Delete route?")).toBeInTheDocument();
    expect(screen.getByText(/permanently remove/)).toBeInTheDocument();
  });

  it("delete confirmation calls deleteRoute and refreshes", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    mockDeleteRoute.mockResolvedValue({ data: { id: "r1" } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: `Delete ${SAMPLE_ROUTE.name}` }));

    // After first load + after delete refresh
    mockFetchRoutes.mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 20, total: 0 },
    });

    // Confirm delete
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteRoute).toHaveBeenCalledWith("r1");
    });

    // Should have refetched routes
    await waitFor(() => {
      expect(mockFetchRoutes).toHaveBeenCalledTimes(2);
    });
  });

  it("cancel dismiss delete dialog", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [SAMPLE_ROUTE],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: `Delete ${SAMPLE_ROUTE.name}` }));
    expect(screen.getByText("Delete route?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete route?")).not.toBeInTheDocument();
    });
  });
});
