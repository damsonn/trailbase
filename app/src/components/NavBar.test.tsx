import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUseSession = vi.fn();

vi.mock("../lib/auth-client.js", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
  signOut: vi.fn(),
}));

import { NavBar } from "./NavBar.js";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("NavBar", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue({ data: null, isPending: false });
  });

  it("shows login/register links when not authenticated", () => {
    renderWithRouter(<NavBar />);
    expect(screen.getByText("Log in")).toHaveAttribute("href", "/login");
    expect(screen.getByText("Sign up")).toHaveAttribute("href", "/register");
  });

  it("shows user email and logout when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: "test@example.com", name: "Test" },
        session: { id: "s1" },
      },
      isPending: false,
    });
    renderWithRouter(<NavBar />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
  });

  it("shows nothing while loading", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });
    renderWithRouter(<NavBar />);
    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
    expect(screen.queryByText("Log out")).not.toBeInTheDocument();
  });

  it("shows Trail base brand link", () => {
    renderWithRouter(<NavBar />);
    const brandText = screen.getByText("Trail base");
    expect(brandText.closest("a")).toHaveAttribute("href", "/");
  });
});
