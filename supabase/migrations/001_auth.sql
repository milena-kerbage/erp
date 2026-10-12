-- ERP application authentication; separate from Supabase's managed auth schema.
-- Apply with the database owner, before using DATABASE_URL in Vercel.
BEGIN;

CREATE SCHEMA IF NOT EXISTS erp_auth;
REVOKE ALL ON SCHEMA erp_auth FROM PUBLIC;
CREATE TABLE IF NOT EXISTS erp_auth.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS erp_auth.sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES erp_auth.users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL,
  seen BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS erp_auth.resets (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES erp_auth.users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL,
  password_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS erp_auth.attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  until BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS erp_auth_sessions_user_idx ON erp_auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS erp_auth_sessions_expires_idx ON erp_auth.sessions(expires);
CREATE INDEX IF NOT EXISTS erp_auth_sessions_seen_idx ON erp_auth.sessions(seen);
CREATE INDEX IF NOT EXISTS erp_auth_resets_user_idx ON erp_auth.resets(user_id);
CREATE INDEX IF NOT EXISTS erp_auth_resets_expires_idx ON erp_auth.resets(expires);
CREATE INDEX IF NOT EXISTS erp_auth_attempts_until_idx ON erp_auth.attempts(until);

-- These tables are accessed only by the ERP server's PostgreSQL connection.
-- No browser-facing Supabase Data API role receives access to credentials.
ALTER TABLE erp_auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_auth.resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_auth.attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_auth FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA erp_auth FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA erp_auth FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA erp_auth FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA erp_auth FROM authenticated;
  END IF;
END;
$$;
COMMIT;
