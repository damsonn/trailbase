import { describe, it, expect } from "vitest";
import { app } from "./app.js";

describe("auth routes", () => {
  it("mounts auth handler at /api/auth/**", async () => {
    // Better-Auth's get-session endpoint should respond (not 404)
    const res = await app.request("/api/auth/get-session");
    expect(res.status).not.toBe(404);
  });

  it("returns null session for unauthenticated request", async () => {
    const res = await app.request("/api/auth/get-session");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("null");
  });

  it("rejects sign-up with missing fields", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com" }),
    });
    // Should return 400 or error (missing name, password)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects sign-up with short password", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        email: "test@test.com",
        password: "short",
      }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects sign-in with missing credentials", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("health check still works alongside auth", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { status: "ok" } });
  });
});
