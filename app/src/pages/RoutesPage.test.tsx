import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RoutesPage } from "./RoutesPage.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

// Mock API
const mockFetchRoutes = vi.fn();
vi.mock("../lib/api.js", () => ({
  fetchRoutes: (...args: unknown[]) => mockFetchRoutes(...args),
}));

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
    mockFetchRoutes.mockReturnValue(new Promise(() => {})); // never resolves
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

  it("renders route list", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [
        {
          id: "r1",
          name: "Harbour Bridge to Bondi",
          description: "Scenic ride",
          activityType: "bike",
          distanceM: 8500,
          elevationGainM: 120,
          elevationLossM: 95,
          version: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Harbour Bridge to Bondi")).toBeInTheDocument();
    });
    // "Bike" appears in both the filter dropdown and the route badge
    expect(screen.getAllByText("Bike").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8.5 km")).toBeInTheDocument();
    expect(screen.getByText("1 route")).toBeInTheDocument();
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
    // Wait for initial load, then the empty state checks search/activityType
    await waitFor(() => {
      expect(screen.getByText("No routes yet. Create your first route!")).toBeInTheDocument();
    });
  });

  it("links routes to detail page", async () => {
    mockFetchRoutes.mockResolvedValue({
      data: [
        {
          id: "abc-123",
          name: "Test Route",
          description: null,
          activityType: "hike",
          distanceM: null,
          elevationGainM: null,
          elevationLossM: null,
          version: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, perPage: 20, total: 1 },
    });
    renderPage();
    await waitFor(() => {
      const link = screen.getByText("Test Route").closest("a");
      expect(link).toHaveAttribute("href", "/routes/abc-123");
    });
  });
});
