import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseSession = vi.fn();

vi.mock("../lib/auth-client.js", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

import { ProtectedRoute } from "./ProtectedRoute.js";

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({ data: null, isPending: false });
  });

  it("shows loading state while session is pending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });
    renderAtPath("/");
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    renderAtPath("/");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "1", email: "test@test.com" },
        session: { id: "s1" },
      },
      isPending: false,
    });
    renderAtPath("/");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
