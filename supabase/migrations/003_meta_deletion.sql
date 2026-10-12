-- Execute depois das migrações de autenticação e WhatsApp, no SQL Editor do Supabase.
BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_meta;
REVOKE ALL ON SCHEMA erp_meta FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS erp_meta.deletion_requests (
  code TEXT PRIMARY KEY,
  subject_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'completed', 'no_matching_data')),
  created_at BIGINT NOT NULL,
  completed_at BIGINT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS deletion_subject ON erp_meta.deletion_requests(subject_hash);
CREATE UNIQUE INDEX IF NOT EXISTS deletion_pending_subject ON erp_meta.deletion_requests(subject_hash) WHERE status = 'pending_review';
ALTER TABLE erp_meta.deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_meta FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp_meta REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
COMMIT;
