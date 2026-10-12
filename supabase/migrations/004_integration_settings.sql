BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_whatsapp;
SET LOCAL search_path TO erp_whatsapp;
CREATE TABLE IF NOT EXISTS integration_settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0 CHECK (encrypted IN (0,1)),
  updated BIGINT NOT NULL, actor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS integration_audit (
  id TEXT PRIMARY KEY, action TEXT NOT NULL, keys_json TEXT NOT NULL,
  actor TEXT NOT NULL, created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS integration_audit_created ON integration_audit(created DESC);
REVOKE ALL ON TABLE integration_settings, integration_audit FROM PUBLIC, anon, authenticated;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_audit ENABLE ROW LEVEL SECURITY;
COMMIT;
