import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

function createDb() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// Eager export for non-test usage (Better-Auth needs it at init time)
export const db = (() => {
  try {
    return createDb();
  } catch {
    // In test environment without DATABASE_URL, return undefined
    // The auth module will fail at runtime if used without DB
    return undefined as unknown as ReturnType<typeof createDb>;
  }
})();

export { schema };
export type Database = ReturnType<typeof createDb>;
