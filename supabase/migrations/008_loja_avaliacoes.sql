-- Avaliações de produtos da loja (ateliemilenakerbage.com.br) com fotos e moderação pelo ERP.
-- Ficam em erp_core, ao lado da auditoria do ERP (erp_audit), e só o servidor acessa: RLS habilitada,
-- sem políticas e sem concessões para PUBLIC, anon e authenticated. Idempotente (IF NOT EXISTS).
BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_core;
SET LOCAL search_path TO erp_core;
CREATE TABLE IF NOT EXISTS loja_avaliacoes (
  id TEXT PRIMARY KEY,
  produto TEXT NOT NULL CHECK (length(produto) BETWEEN 1 AND 160),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  titulo TEXT NOT NULL CHECK (length(titulo) BETWEEN 1 AND 80),
  texto TEXT NOT NULL CHECK (length(texto) BETWEEN 20 AND 2000),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 40),
  cidade TEXT NOT NULL DEFAULT '' CHECK (length(cidade) <= 60),
  para_quem TEXT NOT NULL DEFAULT '' CHECK (para_quem IN ('', 'menina', 'menino', 'surpresa')),
  status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  motivo_recusa TEXT NOT NULL DEFAULT '' CHECK (length(motivo_recusa) <= 500),
  resposta TEXT NOT NULL DEFAULT '' CHECK (length(resposta) <= 1000),
  resposta_em BIGINT,
  texto_busca TEXT NOT NULL,
  fotos INTEGER NOT NULL DEFAULT 0 CHECK (fotos BETWEEN 0 AND 4),
  ip_hash TEXT NOT NULL DEFAULT '',
  consentimento_em BIGINT NOT NULL,
  revisao INTEGER NOT NULL CHECK (revisao > 0),
  criada BIGINT NOT NULL,
  atualizada BIGINT NOT NULL,
  moderada_em BIGINT,
  moderada_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS loja_avaliacoes_produto_status ON loja_avaliacoes(produto, status, criada);
CREATE INDEX IF NOT EXISTS loja_avaliacoes_status_criada ON loja_avaliacoes(status, criada);
CREATE INDEX IF NOT EXISTS loja_avaliacoes_ip ON loja_avaliacoes(ip_hash, criada);
CREATE TABLE IF NOT EXISTS loja_avaliacao_fotos (
  id TEXT PRIMARY KEY,
  avaliacao_id TEXT NOT NULL REFERENCES loja_avaliacoes(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL CHECK (posicao BETWEEN 0 AND 3),
  largura INTEGER NOT NULL CHECK (largura > 0 AND largura <= 1600),
  altura INTEGER NOT NULL CHECK (altura > 0 AND altura <= 1600),
  tipo TEXT NOT NULL CHECK (tipo = 'image/webp'),
  tamanho BIGINT NOT NULL CHECK (tamanho > 0 AND tamanho <= 3145728),
  grande BYTEA NOT NULL,
  mini BYTEA NOT NULL,
  criada BIGINT NOT NULL,
  UNIQUE (avaliacao_id, posicao)
);
CREATE INDEX IF NOT EXISTS loja_avaliacao_fotos_avaliacao ON loja_avaliacao_fotos(avaliacao_id, posicao);
ALTER TABLE loja_avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_avaliacao_fotos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA erp_core FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_core FROM PUBLIC, anon, authenticated;
COMMIT;
