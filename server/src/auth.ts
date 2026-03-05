import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hash, compare } from "bcryptjs";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const BCRYPT_COST = 12;

export const auth = betterAuth({
  basePath: "/api/auth",
  secret: process.env["BETTER_AUTH_SECRET"],
  baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    password: {
      hash: async (password: string) => hash(password, BCRYPT_COST),
      verify: async (data: { hash: string; password: string }) =>
        compare(data.password, data.hash),
    },
    sendResetPassword: async ({ user, url }) => {
      // MVP: log to console. Integrate email service later.
      console.log(`[Auth] Password reset for ${user.email}: ${url}`);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  ],
});

export type Auth = typeof auth;
