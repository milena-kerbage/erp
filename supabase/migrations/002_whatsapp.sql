-- Executar manualmente no SQL Editor do projeto Supabase antes de publicar a Vercel.
-- O backend usa conexão PostgreSQL secreta. Estes esquemas não fazem parte da Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_whatsapp;
REVOKE ALL ON SCHEMA erp_whatsapp FROM PUBLIC, anon, authenticated;
SET LOCAL search_path TO erp_whatsapp;
CREATE TABLE IF NOT EXISTS contacts (
  phone TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '',
  consent_status TEXT NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','granted','revoked')),
  consent_source TEXT NOT NULL DEFAULT '', consent_updated BIGINT,
  opted_out INTEGER NOT NULL DEFAULT 0 CHECK (opted_out IN (0,1)), last_inbound BIGINT, updated BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')), type TEXT NOT NULL,
  text TEXT NOT NULL, status TEXT NOT NULL, status_rank INTEGER NOT NULL DEFAULT 0,
  created BIGINT NOT NULL, error TEXT, media_id TEXT, mime_type TEXT, filename TEXT,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1))
);
CREATE INDEX IF NOT EXISTS messages_phone_created ON messages(phone, created DESC, id DESC);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(phone) WHERE direction = 'inbound' AND is_read = 0;
CREATE TABLE IF NOT EXISTS consent_audit (id TEXT PRIMARY KEY, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, status TEXT NOT NULL, source TEXT NOT NULL, actor TEXT NOT NULL, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS webhook_events (event_key TEXT PRIMARY KEY, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS send_requests (request_key TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, message_id TEXT NOT NULL, phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE, state TEXT NOT NULL, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS pending_statuses (message_id TEXT PRIMARY KEY, status TEXT NOT NULL, rank INTEGER NOT NULL, error TEXT, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS suppression (phone_hash TEXT PRIMARY KEY, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS deletion_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, verification_hash TEXT NOT NULL, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS contacts_updated ON contacts(updated DESC);
CREATE INDEX IF NOT EXISTS messages_retention ON messages(created);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(until);
REVOKE ALL ON ALL TABLES IN SCHEMA erp_whatsapp FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA erp_whatsapp FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp_whatsapp REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp_whatsapp REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
-- Sem políticas de acesso direto pelo navegador. Usuários do ERP passam pela sessão no backend.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
COMMIT;
