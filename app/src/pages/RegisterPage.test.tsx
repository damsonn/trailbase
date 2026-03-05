import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../lib/auth-client.js", () => ({
  signUp: { email: vi.fn() },
}));

import { RegisterPage } from "./RegisterPage.js";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("RegisterPage", () => {
  it("renders registration form", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign up" }),
    ).toBeInTheDocument();
  });

  it("has link to login page", () => {
    renderWithRouter(<RegisterPage />);
    const loginLink = screen.getByRole("link", { name: "Log in" });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("shows password minimum length hint", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
  });

  it("enforces minimum password length", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "minLength",
      "8",
    );
  });
});
