import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouteBuilderPage } from "./RouteBuilderPage.js";

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
vi.mock("react-map-gl/maplibre", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(function MockMap(
      props: { children?: React.ReactNode; onClick?: (e: unknown) => void },
      ref: React.Ref<unknown>,
    ) {
      return React.createElement("div", { "data-testid": "map", ref }, props.children);
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
});
