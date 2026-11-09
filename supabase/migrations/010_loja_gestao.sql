-- Gestão do e-commerce da loja (ateliemilenakerbage.com.br) pelo ERP: catálogo (categorias, produtos com
-- fotos, grupos de opções com acréscimo de preço, coleções), menu do cabeçalho, cupons de campanha com os
-- usos, carrinhos sincronizados das clientes LOGADAS (carrinhos abandonados) e o vínculo cliente → lead do CRM.
-- A loja continua um catálogo com preço: o pedido segue sempre pelo WhatsApp (nada de pagamento online).
-- Ficam em erp_core, ao lado das contas (009) e da auditoria (erp_audit), e só o servidor acessa: RLS
-- habilitada, sem políticas e sem concessões para PUBLIC, anon e authenticated. Idempotente (IF NOT EXISTS),
-- sem DROP. Valores em centavos (BIGINT); datas em milissegundos (BIGINT), como nas migrações anteriores.
BEGIN;
CREATE SCHEMA IF NOT EXISTS erp_core;
SET LOCAL search_path TO erp_core;

-- Árvore de categorias: `caminho` é a chave do motor de URLs ("kit-berco/kits"), mantida pelo servidor a
-- partir do slug e da categoria-mãe (único: uma URL, uma categoria).
CREATE TABLE IF NOT EXISTS loja_categorias (
  id TEXT PRIMARY KEY,
  pai_id TEXT REFERENCES loja_categorias(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 60),
  caminho TEXT NOT NULL UNIQUE CHECK (length(caminho) BETWEEN 1 AND 200),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80),
  descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 2000),
  imagem TEXT NOT NULL DEFAULT '' CHECK (length(imagem) <= 500),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100000),
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  seo_titulo TEXT NOT NULL DEFAULT '' CHECK (length(seo_titulo) <= 70),
  seo_descricao TEXT NOT NULL DEFAULT '' CHECK (length(seo_descricao) <= 170),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  CHECK (pai_id IS NULL OR pai_id <> id)
);
CREATE INDEX IF NOT EXISTS loja_categorias_pai ON loja_categorias(pai_id, ordem);

CREATE TABLE IF NOT EXISTS loja_produtos (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 120),
  sku TEXT NOT NULL UNIQUE CHECK (sku ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 160),
  marca TEXT NOT NULL DEFAULT 'Milena Kerbage' CHECK (length(marca) BETWEEN 1 AND 80),
  resumo TEXT NOT NULL DEFAULT '' CHECK (length(resumo) <= 500),
  descricao_json TEXT NOT NULL DEFAULT '[]' CHECK (length(descricao_json) BETWEEN 2 AND 20000),
  preco_centavos BIGINT NOT NULL CHECK (preco_centavos BETWEEN 0 AND 100000000),
  preco_de_centavos BIGINT CHECK (preco_de_centavos IS NULL OR preco_de_centavos BETWEEN 1 AND 100000000),
  unidade TEXT NOT NULL DEFAULT 'peça' CHECK (length(unidade) BETWEEN 1 AND 60),
  selo TEXT NOT NULL DEFAULT '' CHECK (length(selo) <= 40),
  pecas_json TEXT NOT NULL DEFAULT '[]' CHECK (length(pecas_json) BETWEEN 2 AND 10000),
  personalizacao TEXT NOT NULL DEFAULT '' CHECK (length(personalizacao) <= 300),
  ficha_json TEXT NOT NULL DEFAULT '[]' CHECK (length(ficha_json) BETWEEN 2 AND 30000),
  atributos_json TEXT NOT NULL DEFAULT '{}' CHECK (length(atributos_json) BETWEEN 2 AND 10000),
  disponibilidade TEXT NOT NULL DEFAULT 'sob_encomenda' CHECK (disponibilidade IN ('pronta_entrega', 'sob_encomenda')),
  prazo_min_dias INTEGER CHECK (prazo_min_dias IS NULL OR prazo_min_dias BETWEEN 0 AND 365),
  prazo_max_dias INTEGER CHECK (prazo_max_dias IS NULL OR prazo_max_dias BETWEEN 0 AND 365),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'arquivado')),
  destaque INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)),
  categoria_id TEXT NOT NULL REFERENCES loja_categorias(id) ON DELETE RESTRICT,
  linha_cores TEXT NOT NULL DEFAULT '' CHECK (length(linha_cores) <= 80),
  cor TEXT NOT NULL DEFAULT '' CHECK (length(cor) <= 40),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000000),
  seo_titulo TEXT NOT NULL DEFAULT '' CHECK (length(seo_titulo) <= 70),
  seo_descricao TEXT NOT NULL DEFAULT '' CHECK (length(seo_descricao) <= 170),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  CHECK (prazo_min_dias IS NULL OR prazo_max_dias IS NULL OR prazo_min_dias <= prazo_max_dias),
  CHECK (preco_de_centavos IS NULL OR preco_de_centavos > preco_centavos)
);
CREATE INDEX IF NOT EXISTS loja_produtos_status ON loja_produtos(status, ordem);
CREATE INDEX IF NOT EXISTS loja_produtos_categoria ON loja_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS loja_produtos_linha ON loja_produtos(linha_cores);

-- Categorias extras (o produto aparece também nessas listagens).
CREATE TABLE IF NOT EXISTS loja_produto_categorias (
  produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  categoria_id TEXT NOT NULL REFERENCES loja_categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (produto_id, categoria_id)
);
CREATE INDEX IF NOT EXISTS loja_produto_categorias_categoria ON loja_produto_categorias(categoria_id);

-- "Complete o enxoval" (complemento) e "Você também poderá gostar" (semelhante), em ordem.
CREATE TABLE IF NOT EXISTS loja_produto_relacionados (
  produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  relacionado_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('complemento', 'semelhante')),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000),
  PRIMARY KEY (produto_id, relacionado_id, tipo),
  CHECK (produto_id <> relacionado_id)
);

-- Fotos do produto: o mesmo padrão das fotos de avaliação (WebP recomprimido com sharp, sem metadados,
-- lado maior até 1600 px e miniatura), servidas por rota com cache longo e ETag (hash do conteúdo). Até 12
-- por produto (conferido no servidor); a faixa de `posicao` folga para a reordenação em duas passadas.
CREATE TABLE IF NOT EXISTS loja_produto_imagens (
  id TEXT PRIMARY KEY,
  produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL CHECK (posicao BETWEEN 0 AND 99),
  alt TEXT NOT NULL DEFAULT '' CHECK (length(alt) <= 200),
  cor TEXT NOT NULL DEFAULT '' CHECK (length(cor) <= 40),
  tipo TEXT NOT NULL DEFAULT 'principal' CHECK (tipo IN ('principal', 'detalhe', 'aplicacao')),
  largura INTEGER NOT NULL CHECK (largura > 0 AND largura <= 1600),
  altura INTEGER NOT NULL CHECK (altura > 0 AND altura <= 1600),
  mime TEXT NOT NULL CHECK (mime = 'image/webp'),
  tamanho BIGINT NOT NULL CHECK (tamanho > 0 AND tamanho <= 3145728),
  hash TEXT NOT NULL CHECK (length(hash) = 64),
  grande BYTEA NOT NULL,
  mini BYTEA NOT NULL,
  criada BIGINT NOT NULL,
  UNIQUE (produto_id, posicao)
);
CREATE INDEX IF NOT EXISTS loja_produto_imagens_produto ON loja_produto_imagens(produto_id, posicao);

-- Grupos de opções reaproveitáveis ("Tamanho do berço": escolha única obrigatória; "Bordado com nome":
-- personalização opcional com acréscimo). `chave` identifica o grupo nas importações (idempotência).
CREATE TABLE IF NOT EXISTS loja_grupos_opcoes (
  id TEXT PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE CHECK (chave ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(chave) BETWEEN 1 AND 80),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80),
  descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 300),
  tipo TEXT NOT NULL DEFAULT 'escolha' CHECK (tipo IN ('escolha', 'personalizacao')),
  minimo INTEGER NOT NULL DEFAULT 0 CHECK (minimo BETWEEN 0 AND 20),
  maximo INTEGER NOT NULL DEFAULT 1 CHECK (maximo BETWEEN 1 AND 20),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  CHECK (minimo <= maximo)
);

CREATE TABLE IF NOT EXISTS loja_opcoes (
  id TEXT PRIMARY KEY,
  grupo_id TEXT NOT NULL REFERENCES loja_grupos_opcoes(id) ON DELETE CASCADE,
  rotulo TEXT NOT NULL CHECK (length(rotulo) BETWEEN 1 AND 80),
  acrescimo_centavos BIGINT NOT NULL DEFAULT 0 CHECK (acrescimo_centavos BETWEEN 0 AND 10000000),
  disponivel INTEGER NOT NULL DEFAULT 1 CHECK (disponivel IN (0, 1)),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000),
  UNIQUE (grupo_id, rotulo)
);
CREATE INDEX IF NOT EXISTS loja_opcoes_grupo ON loja_opcoes(grupo_id, ordem);

CREATE TABLE IF NOT EXISTS loja_produto_grupos (
  produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  grupo_id TEXT NOT NULL REFERENCES loja_grupos_opcoes(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100),
  PRIMARY KEY (produto_id, grupo_id)
);
CREATE INDEX IF NOT EXISTS loja_produto_grupos_grupo ON loja_produto_grupos(grupo_id);

-- Coleções (Mais vendidos, Pronta entrega, Kits…): onde aparecem e os produtos em ordem.
CREATE TABLE IF NOT EXISTS loja_colecoes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 80),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80),
  descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 500),
  onde TEXT NOT NULL DEFAULT 'home' CHECK (onde IN ('home', 'listagem', 'ambos')),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100000),
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS loja_colecao_produtos (
  colecao_id TEXT NOT NULL REFERENCES loja_colecoes(id) ON DELETE CASCADE,
  produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 10000),
  PRIMARY KEY (colecao_id, produto_id)
);
CREATE INDEX IF NOT EXISTS loja_colecao_produtos_produto ON loja_colecao_produtos(produto_id);

-- Menu do cabeçalho (mega menu): itens de 1º nível (painel de colunas ou de cards) e, dentro deles, as
-- seções: destaque (links grandes), secundario, coluna (com links), card (5:6 com tom/ícone/imagem) e
-- promo (bloco editorial 16:9).
CREATE TABLE IF NOT EXISTS loja_menu_itens (
  id TEXT PRIMARY KEY,
  pai_id TEXT REFERENCES loja_menu_itens(id) ON DELETE CASCADE,
  secao TEXT NOT NULL CHECK (secao IN ('item', 'destaque', 'secundario', 'coluna', 'link', 'card', 'promo')),
  rotulo TEXT NOT NULL CHECK (length(rotulo) BETWEEN 1 AND 80),
  href TEXT NOT NULL CHECK (length(href) BETWEEN 1 AND 500),
  descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 300),
  imagem TEXT NOT NULL DEFAULT '' CHECK (length(imagem) <= 500),
  tom TEXT NOT NULL DEFAULT '' CHECK (length(tom) <= 30),
  icone TEXT NOT NULL DEFAULT '' CHECK (length(icone) <= 30),
  painel TEXT NOT NULL DEFAULT '' CHECK (painel IN ('', 'colunas', 'cards')),
  externo INTEGER NOT NULL DEFAULT 0 CHECK (externo IN (0, 1)),
  destaque INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)),
  so_botao INTEGER NOT NULL DEFAULT 0 CHECK (so_botao IN (0, 1)),
  ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 10000),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  CHECK ((secao = 'item') = (pai_id IS NULL))
);
CREATE INDEX IF NOT EXISTS loja_menu_itens_pai ON loja_menu_itens(pai_id, ordem);

-- Cupons de campanha (ENXOVAL10…), além do cupom de boas-vindas de cada conta (loja_cupons, 009), que
-- continua igual. Um cupom por pedido; conferidos no servidor ao criar o pedido.
CREATE TABLE IF NOT EXISTS loja_cupons_campanha (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'),
  descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 200),
  tipo TEXT NOT NULL CHECK (tipo IN ('percentual', 'valor')),
  valor BIGINT NOT NULL CHECK (valor > 0 AND valor <= 100000000),
  minimo_centavos BIGINT NOT NULL DEFAULT 0 CHECK (minimo_centavos BETWEEN 0 AND 100000000),
  inicio BIGINT,
  fim BIGINT,
  limite_total INTEGER CHECK (limite_total IS NULL OR limite_total BETWEEN 1 AND 1000000),
  limite_por_cliente INTEGER CHECK (limite_por_cliente IS NULL OR limite_por_cliente BETWEEN 1 AND 1000),
  primeira_compra INTEGER NOT NULL DEFAULT 0 CHECK (primeira_compra IN (0, 1)),
  exibir INTEGER NOT NULL DEFAULT 0 CHECK (exibir IN (0, 1)),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  CHECK (tipo <> 'percentual' OR valor BETWEEN 1 AND 50),
  CHECK (inicio IS NULL OR fim IS NULL OR inicio < fim)
);

CREATE TABLE IF NOT EXISTS loja_cupom_usos (
  id TEXT PRIMARY KEY,
  cupom_id TEXT NOT NULL REFERENCES loja_cupons_campanha(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES loja_clientes(id) ON DELETE SET NULL,
  pedido_numero TEXT NOT NULL UNIQUE CHECK (length(pedido_numero) BETWEEN 4 AND 40),
  desconto_centavos BIGINT NOT NULL CHECK (desconto_centavos >= 0),
  criado BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS loja_cupom_usos_cupom ON loja_cupom_usos(cupom_id, criado);
CREATE INDEX IF NOT EXISTS loja_cupom_usos_cliente ON loja_cupom_usos(cliente_id, cupom_id);

-- Carrinho sincronizado (SÓ de cliente logada; LGPD: avisado na Política de privacidade, seção #conta).
-- Abandonado = itens, não convertido e sem atualização há X horas (configurável na consulta do ERP).
CREATE TABLE IF NOT EXISTS loja_carrinhos (
  cliente_id TEXT PRIMARY KEY REFERENCES loja_clientes(id) ON DELETE CASCADE,
  itens_json TEXT NOT NULL DEFAULT '[]' CHECK (length(itens_json) BETWEEN 2 AND 65536),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade BETWEEN 0 AND 49950),
  total_centavos BIGINT NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  criado BIGINT NOT NULL,
  atualizado BIGINT NOT NULL,
  convertido_em BIGINT,
  pedido_numero TEXT CHECK (pedido_numero IS NULL OR length(pedido_numero) <= 40),
  lembrete_em BIGINT
);
CREATE INDEX IF NOT EXISTS loja_carrinhos_atualizado ON loja_carrinhos(convertido_em, atualizado);

-- Cliente da loja → lead do CRM (erp_core.leads), criado ou ligado por e-mail/WhatsApp no cadastro.
CREATE TABLE IF NOT EXISTS loja_cliente_leads (
  cliente_id TEXT PRIMARY KEY REFERENCES loja_clientes(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  criado BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS loja_cliente_leads_lead ON loja_cliente_leads(lead_id);

ALTER TABLE loja_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produto_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produto_relacionados ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produto_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_grupos_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produto_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_colecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_colecao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_menu_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_cupons_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_cupom_usos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_carrinhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_cliente_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA erp_core FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_core FROM PUBLIC, anon, authenticated;
COMMIT;
