import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../lib/auth-client.js", () => ({
  signIn: { email: vi.fn() },
}));

import { LoginPage } from "./LoginPage.js";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("LoginPage", () => {
  it("renders login form", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("has link to register page", () => {
    renderWithRouter(<LoginPage />);
    const signUpLink = screen.getByRole("link", { name: "Sign up" });
    expect(signUpLink).toHaveAttribute("href", "/register");
  });

  it("has link to forgot password", () => {
    renderWithRouter(<LoginPage />);
    const forgotLink = screen.getByRole("link", { name: "Forgot password?" });
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  it("requires email and password fields", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });
});
