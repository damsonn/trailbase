import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { app } from "./app.js";
import { getDb } from "./db/index.js";
import { user, session, account } from "./db/schema.js";

const TEST_USER = {
  name: "Integration Test",
  email: `test-${Date.now()}@integration.test`,
  password: "securepassword123",
};

describe("auth integration", () => {
  beforeAll(async () => {
    const db = getDb();
    // Ensure tables exist by running a simple query
    await db.execute(sql`SELECT 1`);
  });

  afterAll(async () => {
    const db = getDb();
    // Clean up test user and related records
    await db
      .delete(account)
      .where(
        sql`${account.userId} IN (SELECT id FROM "user" WHERE email = ${TEST_USER.email})`,
      );
    await db
      .delete(session)
      .where(
        sql`${session.userId} IN (SELECT id FROM "user" WHERE email = ${TEST_USER.email})`,
      );
    await db.delete(user).where(sql`${user.email} = ${TEST_USER.email}`);
  });

  it("signs up a new user", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_USER),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(TEST_USER.email);
    expect(body.user.name).toBe(TEST_USER.name);
    // Password should never be returned
    expect(body.user.password).toBeUndefined();
  });

  it("rejects duplicate sign-up", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_USER),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("signs in with correct credentials", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(TEST_USER.email);
    // Session is set via cookie
    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBeGreaterThan(0);
  });

  it("rejects sign-in with wrong password", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: "wrongpassword123",
      }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("returns session for authenticated request", async () => {
    // Sign in to get session cookie
    const signInRes = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    const cookies = signInRes.headers.getSetCookie();
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

    const sessionRes = await app.request("/api/auth/get-session", {
      headers: { Cookie: cookieHeader },
    });

    expect(sessionRes.status).toBe(200);
    const body = await sessionRes.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(TEST_USER.email);
  });
});
