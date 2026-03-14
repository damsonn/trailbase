import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock auth-client — only covers direct imports from this relative path
vi.mock("./lib/auth-client.js", () => ({
  useSession: () => ({ data: null, isPending: false }),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  authClient: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { App } from "./App.js";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows login form for unauthenticated users", () => {
    render(<App />);
    // ProtectedRoute redirects to /login, login form should render
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});
