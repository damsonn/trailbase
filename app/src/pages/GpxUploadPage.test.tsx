import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GpxUploadPage } from "./GpxUploadPage.js";
import { importGpx, ApiError } from "../lib/api.js";

// Mock auth
vi.mock("../lib/auth-client.js", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com" } }, isPending: false }),
  signOut: vi.fn(),
}));

// Mock API
vi.mock("../lib/api.js", () => ({
  importGpx: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/routes/import"]}>
      <GpxUploadPage />
    </MemoryRouter>,
  );
}

describe("GpxUploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upload zone", () => {
    renderPage();
    expect(screen.getByText(/drop a .gpx file here/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Import GPX" })).toBeInTheDocument();
  });

  it("shows file info after file selection", async () => {
    renderPage();
    const input = screen.getByTestId("gpx-file-input");
    const file = new File(["<gpx></gpx>"], "my-route.gpx", { type: "application/gpx+xml" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("my-route.gpx")).toBeInTheDocument();
    // Name should be pre-filled
    const nameInput = screen.getByLabelText(/route name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("my-route");
  });

  it("shows error for non-GPX file", () => {
    renderPage();
    const input = screen.getByTestId("gpx-file-input");
    const file = new File(["hello"], "readme.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/please select a .gpx file/i)).toBeInTheDocument();
  });

  it("shows error message when API returns error", async () => {
    vi.mocked(importGpx).mockRejectedValue(
      new ApiError("Invalid GPX: no tracks found", "VALIDATION_ERROR", 400),
    );

    renderPage();
    const input = screen.getByTestId("gpx-file-input");
    const file = new File(["<gpx></gpx>"], "bad.gpx", { type: "application/gpx+xml" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Import Route"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid GPX: no tracks found");
    });
  });

  it("navigates to route detail on successful import", async () => {
    vi.mocked(importGpx).mockResolvedValue({
      data: { id: "route-123", name: "Test", description: null, activityType: "hike", distanceM: 1000, elevationGainM: 50, elevationLossM: 30, version: 1, createdAt: "", updatedAt: "" },
    });

    renderPage();
    const input = screen.getByTestId("gpx-file-input");
    const file = new File(["<gpx></gpx>"], "test.gpx", { type: "application/gpx+xml" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Import Route"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/routes/route-123");
    });
  });

  it("renders breadcrumb with link to routes", () => {
    renderPage();
    const routesLink = screen.getByText("Routes");
    expect(routesLink.closest("a")).toHaveAttribute("href", "/routes");
  });
});
