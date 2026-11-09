-- Índices para consultas e retenção existentes. Não altera registros nem permissões.
-- Em bases grandes, planejar CREATE INDEX CONCURRENTLY fora de transação.
BEGIN;
CREATE INDEX IF NOT EXISTS attempts_until ON erp_auth.attempts(until);
CREATE INDEX IF NOT EXISTS sessions_user_seen ON erp_auth.sessions(user_id, seen DESC);
CREATE INDEX IF NOT EXISTS sessions_expires ON erp_auth.sessions(expires);
CREATE INDEX IF NOT EXISTS sessions_seen ON erp_auth.sessions(seen);
CREATE INDEX IF NOT EXISTS resets_user ON erp_auth.resets(user_id);
CREATE INDEX IF NOT EXISTS resets_expires ON erp_auth.resets(expires);
CREATE INDEX IF NOT EXISTS rate_limits_until ON erp_whatsapp.rate_limits(until);
CREATE INDEX IF NOT EXISTS messages_phone_cursor ON erp_whatsapp.messages(phone, created DESC, id DESC);
CREATE INDEX IF NOT EXISTS messages_unread_phone ON erp_whatsapp.messages(phone) WHERE direction = 'inbound' AND is_read = 0;
CREATE INDEX IF NOT EXISTS contacts_active_updated ON erp_whatsapp.contacts(updated DESC) WHERE opted_out = 0;
CREATE INDEX IF NOT EXISTS messages_retention ON erp_whatsapp.messages(created);
CREATE INDEX IF NOT EXISTS leads_funnel ON erp_core.leads(funnel_id);
COMMIT;
