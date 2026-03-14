import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RouteDetailPage } from "./RouteDetailPage.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

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

  it("has breadcrumb navigation", async () => {
    mockFetchRoute.mockResolvedValue({ data: MOCK_ROUTE });
    renderPage();
    await waitFor(() => {
      const breadcrumbLinks = screen.getAllByRole("link", { name: "Routes" });
      expect(breadcrumbLinks.some((el) => el.getAttribute("href") === "/routes")).toBe(true);
    });
  });
});
