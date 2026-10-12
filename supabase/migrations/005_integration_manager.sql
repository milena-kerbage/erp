BEGIN;
SET LOCAL search_path TO erp_whatsapp;
CREATE TABLE IF NOT EXISTS management_checklist (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','complete','blocked')),
  note TEXT NOT NULL, updated BIGINT NOT NULL, actor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS management_tests (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, ok INTEGER NOT NULL CHECK (ok IN (0,1)),
  summary TEXT NOT NULL, details_json TEXT NOT NULL, created BIGINT NOT NULL, actor TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS management_tests_created ON management_tests(created DESC);
CREATE TABLE IF NOT EXISTS management_oauth_states (
  hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_hash TEXT NOT NULL, expires BIGINT NOT NULL
);
ALTER TABLE management_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_whatsapp FROM PUBLIC, anon, authenticated;
COMMIT;
