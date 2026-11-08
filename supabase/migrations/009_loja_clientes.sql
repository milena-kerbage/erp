-- Contas de CLIENTE da loja (ateliemilenakerbage.com.br): cadastro por e-mail e senha, sessões próprias,
-- links de redefinição gerados pela equipe no ERP, cupom de 5% na primeira compra e os pedidos feitos
-- pelo site (que seguem pelo WhatsApp). Separadas das contas da EQUIPE (erp_auth.users): outra tabela,
-- outro cookie, nenhuma chave estrangeira entre as duas.
-- Ficam em erp_core, ao lado da auditoria do ERP (erp_audit), e só o servidor acessa: RLS habilitada,
-- sem políticas e sem concessões para PUBLIC, anon e authenticated. Idempotente (IF NOT EXISTS), sem DROP.
-- Senhas só como hash scrypt; tokens de sessão e de redefinição só como SHA-256.
BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_core;
SET LOCAL search_path TO erp_core;

CREATE TABLE IF NOT EXISTS loja_clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 3 AND 80),
  email TEXT NOT NULL UNIQUE CHECK (length(email) BETWEEN 6 AND 254 AND email = lower(email)),
  whatsapp TEXT NOT NULL CHECK (whatsapp ~ '^[0-9]{10,11}$'),
  senha_hash TEXT NOT NULL CHECK (length(senha_hash) BETWEEN 1 AND 300),
  termos_versao TEXT NOT NULL CHECK (length(termos_versao) BETWEEN 1 AND 20),
  termos_aceitos_em BIGINT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '' CHECK (cpf = '' OR cpf ~ '^[0-9]{11}$'),
  cep TEXT NOT NULL DEFAULT '' CHECK (cep = '' OR cep ~ '^[0-9]{8}$'),
  endereco TEXT NOT NULL DEFAULT '' CHECK (length(endereco) <= 160),
  cidade TEXT NOT NULL DEFAULT '' CHECK (length(cidade) <= 60),
  uf TEXT NOT NULL DEFAULT '' CHECK (uf = '' OR uf ~ '^[A-Z]{2}$'),
  bebe_nome TEXT NOT NULL DEFAULT '' CHECK (length(bebe_nome) <= 60),
  bebe_data TEXT NOT NULL DEFAULT '' CHECK (bebe_data = '' OR bebe_data ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  bebe_data_tipo TEXT NOT NULL DEFAULT '' CHECK (bebe_data_tipo IN ('', 'prevista', 'nascimento')),
  como_conheceu TEXT NOT NULL DEFAULT '' CHECK (length(como_conheceu) <= 20),
  preferencias TEXT NOT NULL DEFAULT '' CHECK (length(preferencias) <= 500),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'bloqueada')),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  ultimo_acesso BIGINT
);
CREATE INDEX IF NOT EXISTS loja_clientes_criado ON loja_clientes(criado);

CREATE TABLE IF NOT EXISTS loja_sessoes (
  hash TEXT PRIMARY KEY CHECK (length(hash) = 64),
  cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE,
  criada BIGINT NOT NULL,
  expira BIGINT NOT NULL,
  visto BIGINT NOT NULL,
  revogada_em BIGINT
);
CREATE INDEX IF NOT EXISTS loja_sessoes_cliente ON loja_sessoes(cliente_id, criada);
CREATE INDEX IF NOT EXISTS loja_sessoes_expira ON loja_sessoes(expira);

CREATE TABLE IF NOT EXISTS loja_redefinicoes (
  hash TEXT PRIMARY KEY CHECK (length(hash) = 64),
  cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE,
  criado_por TEXT NOT NULL CHECK (length(criado_por) BETWEEN 1 AND 120),
  criada BIGINT NOT NULL,
  expira BIGINT NOT NULL,
  usada_em BIGINT,
  versao_senha TEXT NOT NULL CHECK (length(versao_senha) = 64)
);
CREATE INDEX IF NOT EXISTS loja_redefinicoes_cliente ON loja_redefinicoes(cliente_id);

CREATE TABLE IF NOT EXISTS loja_cupons (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE CHECK (length(codigo) BETWEEN 6 AND 30),
  tipo TEXT NOT NULL CHECK (tipo = 'boas_vindas'),
  percentual INTEGER NOT NULL CHECK (percentual BETWEEN 1 AND 50),
  criado BIGINT NOT NULL,
  usado_em BIGINT,
  pedido_numero TEXT CHECK (pedido_numero IS NULL OR length(pedido_numero) <= 40),
  CHECK ((usado_em IS NULL AND pedido_numero IS NULL) OR (usado_em IS NOT NULL AND pedido_numero IS NOT NULL)),
  UNIQUE (cliente_id, tipo)
);

CREATE TABLE IF NOT EXISTS loja_pedidos (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE CHECK (length(numero) BETWEEN 4 AND 40),
  cliente_id TEXT REFERENCES loja_clientes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL DEFAULT '' CHECK (length(nome) <= 80),
  whatsapp TEXT NOT NULL DEFAULT '' CHECK (length(whatsapp) <= 11),
  email TEXT NOT NULL DEFAULT '' CHECK (length(email) <= 254),
  itens_json TEXT NOT NULL CHECK (length(itens_json) BETWEEN 2 AND 65536),
  quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 49950),
  subtotal_centavos BIGINT NOT NULL CHECK (subtotal_centavos >= 0),
  desconto_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0 AND desconto_centavos <= subtotal_centavos),
  total_centavos BIGINT NOT NULL CHECK (total_centavos >= 0),
  cupom_codigo TEXT NOT NULL DEFAULT '' CHECK (length(cupom_codigo) <= 30),
  cupom_percentual INTEGER NOT NULL DEFAULT 0 CHECK (cupom_percentual BETWEEN 0 AND 50),
  retirar INTEGER NOT NULL DEFAULT 0 CHECK (retirar IN (0, 1)),
  local TEXT NOT NULL DEFAULT '' CHECK (length(local) <= 80),
  observacoes TEXT NOT NULL DEFAULT '' CHECK (length(observacoes) <= 500),
  mensagem TEXT NOT NULL CHECK (length(mensagem) BETWEEN 1 AND 20000),
  status TEXT NOT NULL DEFAULT 'enviado_whatsapp' CHECK (status IN ('enviado_whatsapp', 'pagamento_confirmado', 'despachado', 'entregue', 'cancelado')),
  anonimizado INTEGER NOT NULL DEFAULT 0 CHECK (anonimizado IN (0, 1)),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS loja_pedidos_cliente ON loja_pedidos(cliente_id, criado);
CREATE INDEX IF NOT EXISTS loja_pedidos_criado ON loja_pedidos(criado);
CREATE INDEX IF NOT EXISTS loja_pedidos_status ON loja_pedidos(status, criado);

ALTER TABLE loja_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_redefinicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_pedidos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA erp_core FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_core FROM PUBLIC, anon, authenticated;
COMMIT;
