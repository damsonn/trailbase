-- Better-Auth schema migration
-- Adapts existing users/sessions tables and adds account/verification tables

-- 1. Drop old sessions table (incompatible with Better-Auth schema)
DROP TABLE IF EXISTS "sessions";

-- 2. Adapt users table for Better-Auth
--    Better-Auth uses text IDs, so convert uuid → text
--    First drop FK constraints that reference users
ALTER TABLE "routes" DROP CONSTRAINT IF EXISTS "routes_user_id_users_id_fk";

ALTER TABLE "routes" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;
ALTER TABLE "users" ALTER COLUMN "id" TYPE text USING "id"::text;

-- Add Better-Auth required columns
ALTER TABLE "users" ADD COLUMN "name" text NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "image" text;

-- Remove password_hash (Better-Auth stores passwords in the account table)
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";

-- Rename users → user (Better-Auth default model name)
ALTER TABLE "users" RENAME TO "user";
ALTER INDEX "users_email_idx" RENAME TO "user_email_idx";

-- Re-add FK constraint
ALTER TABLE "routes" ADD CONSTRAINT "routes_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE;

-- 3. Create session table (Better-Auth schema)
CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "session_token_idx" ON "session" ("token");
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");

-- 4. Create account table (Better-Auth stores credentials here)
CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamptz,
  "refresh_token_expires_at" timestamptz,
  "scope" text,
  "password" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");

-- 5. Create verification table (for password reset tokens, email verification)
CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
