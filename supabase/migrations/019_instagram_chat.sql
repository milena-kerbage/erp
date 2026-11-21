-- Chat do Instagram (Direct) no ERP: contatos e mensagens da conta conectada, vindos do webhook e da sincronização do
-- histórico pela API. Aditiva e idempotente: não altera registros existentes.
BEGIN;
SET LOCAL search_path TO erp_meta;

CREATE TABLE IF NOT EXISTS instagram_chat_contatos (
  igsid TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL DEFAULT '',
  foto TEXT NOT NULL DEFAULT '',
  ultima_entrada BIGINT,
  atualizado BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS instagram_chat_mensagens (
  id TEXT PRIMARY KEY,
  igsid TEXT NOT NULL REFERENCES instagram_chat_contatos(igsid) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  direcao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  anexos TEXT NOT NULL DEFAULT '[]',
  criado BIGINT NOT NULL,
  lida INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'recebida',
  autor TEXT
);
CREATE INDEX IF NOT EXISTS instagram_chat_msg_contato ON instagram_chat_mensagens(igsid, criado);
CREATE INDEX IF NOT EXISTS instagram_chat_msg_nao_lidas ON instagram_chat_mensagens(igsid) WHERE lida = 0 AND direcao = 'entrada';

ALTER TABLE instagram_chat_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_chat_mensagens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON instagram_chat_contatos, instagram_chat_mensagens FROM PUBLIC, anon, authenticated;
COMMIT;
