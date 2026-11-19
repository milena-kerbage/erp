-- Conversas no padrão do ERP da Le Ange: fixar, arquivar, marcar como não lida, etiquetas e favoritos por pessoa;
-- respostas citadas, reações e mídia guardada no storage (R2) nas mensagens; respostas rápidas da equipe.
-- Aditiva e idempotente: não altera registros existentes.
BEGIN;
SET LOCAL search_path TO erp_whatsapp;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pinned_at BIGINT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marked_unread INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS labels TEXT NOT NULL DEFAULT '[]';

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_key TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author TEXT;

CREATE TABLE IF NOT EXISTS stars (
  phone TEXT NOT NULL REFERENCES contacts(phone) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created BIGINT NOT NULL,
  PRIMARY KEY (phone, user_id)
);
CREATE TABLE IF NOT EXISTS quick_replies (
  id TEXT PRIMARY KEY,
  shortcut TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  created BIGINT NOT NULL,
  updated BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS contacts_pinned ON contacts(pinned_at DESC) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_media_key ON messages(media_key) WHERE media_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS stars_user ON stars(user_id);

ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stars, quick_replies FROM PUBLIC, anon, authenticated;
COMMIT;
