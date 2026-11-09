import { randomUUID } from 'node:crypto';
import { ApiError } from '../../erp/access.ts';
import { contasDb } from '../contas.ts';
import { storageConfiguration } from '../../database.ts';

// Gestão do e-commerce (migração 010): espelho SQLite das tabelas (desenvolvimento local e testes) e as
// peças comuns da camada de dados (banco, auditoria, trava, validação de texto e de números).
// No PostgreSQL/Supabase as tabelas vêm SÓ da migração 010; aqui, o mesmo desenho com CHECKs de tamanho
// equivalentes (SQLite não tem `~`).

export const gestaoSchema = `CREATE TABLE IF NOT EXISTS loja_categorias (id TEXT PRIMARY KEY, pai_id TEXT REFERENCES loja_categorias(id) ON DELETE RESTRICT, slug TEXT NOT NULL CHECK (length(slug) BETWEEN 1 AND 60), caminho TEXT NOT NULL UNIQUE CHECK (length(caminho) BETWEEN 1 AND 200), nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80), descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 2000), imagem TEXT NOT NULL DEFAULT '' CHECK (length(imagem) <= 500), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100000), ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)), seo_titulo TEXT NOT NULL DEFAULT '' CHECK (length(seo_titulo) <= 70), seo_descricao TEXT NOT NULL DEFAULT '' CHECK (length(seo_descricao) <= 170), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, CHECK (pai_id IS NULL OR pai_id <> id));
CREATE INDEX IF NOT EXISTS loja_categorias_pai ON loja_categorias(pai_id, ordem);
CREATE TABLE IF NOT EXISTS loja_produtos (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 120), sku TEXT NOT NULL UNIQUE CHECK (length(sku) BETWEEN 1 AND 40), nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 160), marca TEXT NOT NULL DEFAULT 'Milena Kerbage' CHECK (length(marca) BETWEEN 1 AND 80), resumo TEXT NOT NULL DEFAULT '' CHECK (length(resumo) <= 500), descricao_json TEXT NOT NULL DEFAULT '[]' CHECK (length(descricao_json) BETWEEN 2 AND 20000), preco_centavos INTEGER NOT NULL CHECK (preco_centavos BETWEEN 0 AND 100000000), preco_de_centavos INTEGER CHECK (preco_de_centavos IS NULL OR preco_de_centavos BETWEEN 1 AND 100000000), unidade TEXT NOT NULL DEFAULT 'peça' CHECK (length(unidade) BETWEEN 1 AND 60), selo TEXT NOT NULL DEFAULT '' CHECK (length(selo) <= 40), pecas_json TEXT NOT NULL DEFAULT '[]' CHECK (length(pecas_json) BETWEEN 2 AND 10000), personalizacao TEXT NOT NULL DEFAULT '' CHECK (length(personalizacao) <= 300), ficha_json TEXT NOT NULL DEFAULT '[]' CHECK (length(ficha_json) BETWEEN 2 AND 30000), atributos_json TEXT NOT NULL DEFAULT '{}' CHECK (length(atributos_json) BETWEEN 2 AND 10000), disponibilidade TEXT NOT NULL DEFAULT 'sob_encomenda' CHECK (disponibilidade IN ('pronta_entrega', 'sob_encomenda')), prazo_min_dias INTEGER CHECK (prazo_min_dias IS NULL OR prazo_min_dias BETWEEN 0 AND 365), prazo_max_dias INTEGER CHECK (prazo_max_dias IS NULL OR prazo_max_dias BETWEEN 0 AND 365), status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'arquivado')), destaque INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)), categoria_id TEXT NOT NULL REFERENCES loja_categorias(id) ON DELETE RESTRICT, linha_cores TEXT NOT NULL DEFAULT '' CHECK (length(linha_cores) <= 80), cor TEXT NOT NULL DEFAULT '' CHECK (length(cor) <= 40), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000000), seo_titulo TEXT NOT NULL DEFAULT '' CHECK (length(seo_titulo) <= 70), seo_descricao TEXT NOT NULL DEFAULT '' CHECK (length(seo_descricao) <= 170), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, CHECK (prazo_min_dias IS NULL OR prazo_max_dias IS NULL OR prazo_min_dias <= prazo_max_dias), CHECK (preco_de_centavos IS NULL OR preco_de_centavos > preco_centavos));
CREATE INDEX IF NOT EXISTS loja_produtos_status ON loja_produtos(status, ordem);
CREATE INDEX IF NOT EXISTS loja_produtos_categoria ON loja_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS loja_produtos_linha ON loja_produtos(linha_cores);
CREATE TABLE IF NOT EXISTS loja_produto_categorias (produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, categoria_id TEXT NOT NULL REFERENCES loja_categorias(id) ON DELETE CASCADE, PRIMARY KEY (produto_id, categoria_id));
CREATE INDEX IF NOT EXISTS loja_produto_categorias_categoria ON loja_produto_categorias(categoria_id);
CREATE TABLE IF NOT EXISTS loja_produto_relacionados (produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, relacionado_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, tipo TEXT NOT NULL CHECK (tipo IN ('complemento', 'semelhante')), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000), PRIMARY KEY (produto_id, relacionado_id, tipo), CHECK (produto_id <> relacionado_id));
CREATE TABLE IF NOT EXISTS loja_produto_imagens (id TEXT PRIMARY KEY, produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, posicao INTEGER NOT NULL CHECK (posicao BETWEEN 0 AND 99), alt TEXT NOT NULL DEFAULT '' CHECK (length(alt) <= 200), cor TEXT NOT NULL DEFAULT '' CHECK (length(cor) <= 40), tipo TEXT NOT NULL DEFAULT 'principal' CHECK (tipo IN ('principal', 'detalhe', 'aplicacao')), largura INTEGER NOT NULL CHECK (largura > 0 AND largura <= 1600), altura INTEGER NOT NULL CHECK (altura > 0 AND altura <= 1600), mime TEXT NOT NULL CHECK (mime = 'image/webp'), tamanho INTEGER NOT NULL CHECK (tamanho > 0 AND tamanho <= 3145728), hash TEXT NOT NULL CHECK (length(hash) = 64), grande BLOB NOT NULL, mini BLOB NOT NULL, criada INTEGER NOT NULL, grande_key TEXT, mini_key TEXT, UNIQUE (produto_id, posicao));
CREATE INDEX IF NOT EXISTS loja_produto_imagens_produto ON loja_produto_imagens(produto_id, posicao);
CREATE TABLE IF NOT EXISTS loja_grupos_opcoes (id TEXT PRIMARY KEY, chave TEXT NOT NULL UNIQUE CHECK (length(chave) BETWEEN 1 AND 80), nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80), descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 300), tipo TEXT NOT NULL DEFAULT 'escolha' CHECK (tipo IN ('escolha', 'personalizacao')), minimo INTEGER NOT NULL DEFAULT 0 CHECK (minimo BETWEEN 0 AND 20), maximo INTEGER NOT NULL DEFAULT 1 CHECK (maximo BETWEEN 1 AND 20), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, CHECK (minimo <= maximo));
CREATE TABLE IF NOT EXISTS loja_opcoes (id TEXT PRIMARY KEY, grupo_id TEXT NOT NULL REFERENCES loja_grupos_opcoes(id) ON DELETE CASCADE, rotulo TEXT NOT NULL CHECK (length(rotulo) BETWEEN 1 AND 80), acrescimo_centavos INTEGER NOT NULL DEFAULT 0 CHECK (acrescimo_centavos BETWEEN 0 AND 10000000), disponivel INTEGER NOT NULL DEFAULT 1 CHECK (disponivel IN (0, 1)), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 1000), UNIQUE (grupo_id, rotulo));
CREATE INDEX IF NOT EXISTS loja_opcoes_grupo ON loja_opcoes(grupo_id, ordem);
CREATE TABLE IF NOT EXISTS loja_produto_grupos (produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, grupo_id TEXT NOT NULL REFERENCES loja_grupos_opcoes(id) ON DELETE RESTRICT, ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100), PRIMARY KEY (produto_id, grupo_id));
CREATE INDEX IF NOT EXISTS loja_produto_grupos_grupo ON loja_produto_grupos(grupo_id);
CREATE TABLE IF NOT EXISTS loja_colecoes (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 80), nome TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80), descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 500), onde TEXT NOT NULL DEFAULT 'home' CHECK (onde IN ('home', 'listagem', 'ambos')), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100000), ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS loja_colecao_produtos (colecao_id TEXT NOT NULL REFERENCES loja_colecoes(id) ON DELETE CASCADE, produto_id TEXT NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE, ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 10000), PRIMARY KEY (colecao_id, produto_id));
CREATE INDEX IF NOT EXISTS loja_colecao_produtos_produto ON loja_colecao_produtos(produto_id);
CREATE TABLE IF NOT EXISTS loja_menu_itens (id TEXT PRIMARY KEY, pai_id TEXT REFERENCES loja_menu_itens(id) ON DELETE CASCADE, secao TEXT NOT NULL CHECK (secao IN ('item', 'destaque', 'secundario', 'coluna', 'link', 'card', 'promo')), rotulo TEXT NOT NULL CHECK (length(rotulo) BETWEEN 1 AND 80), href TEXT NOT NULL CHECK (length(href) BETWEEN 1 AND 500), descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 300), imagem TEXT NOT NULL DEFAULT '' CHECK (length(imagem) <= 500), tom TEXT NOT NULL DEFAULT '' CHECK (length(tom) <= 30), icone TEXT NOT NULL DEFAULT '' CHECK (length(icone) <= 30), painel TEXT NOT NULL DEFAULT '' CHECK (painel IN ('', 'colunas', 'cards')), externo INTEGER NOT NULL DEFAULT 0 CHECK (externo IN (0, 1)), destaque INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)), so_botao INTEGER NOT NULL DEFAULT 0 CHECK (so_botao IN (0, 1)), ordem INTEGER NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 10000), ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, CHECK ((secao = 'item') = (pai_id IS NULL)));
CREATE INDEX IF NOT EXISTS loja_menu_itens_pai ON loja_menu_itens(pai_id, ordem);
CREATE TABLE IF NOT EXISTS loja_cupons_campanha (id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE CHECK (length(codigo) BETWEEN 3 AND 30 AND codigo = upper(codigo)), descricao TEXT NOT NULL DEFAULT '' CHECK (length(descricao) <= 200), tipo TEXT NOT NULL CHECK (tipo IN ('percentual', 'valor')), valor INTEGER NOT NULL CHECK (valor > 0 AND valor <= 100000000), minimo_centavos INTEGER NOT NULL DEFAULT 0 CHECK (minimo_centavos BETWEEN 0 AND 100000000), inicio INTEGER, fim INTEGER, limite_total INTEGER CHECK (limite_total IS NULL OR limite_total BETWEEN 1 AND 1000000), limite_por_cliente INTEGER CHECK (limite_por_cliente IS NULL OR limite_por_cliente BETWEEN 1 AND 1000), primeira_compra INTEGER NOT NULL DEFAULT 0 CHECK (primeira_compra IN (0, 1)), exibir INTEGER NOT NULL DEFAULT 0 CHECK (exibir IN (0, 1)), ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)), revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao > 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, CHECK (tipo <> 'percentual' OR valor BETWEEN 1 AND 50), CHECK (inicio IS NULL OR fim IS NULL OR inicio < fim));
CREATE TABLE IF NOT EXISTS loja_cupom_usos (id TEXT PRIMARY KEY, cupom_id TEXT NOT NULL REFERENCES loja_cupons_campanha(id) ON DELETE CASCADE, cliente_id TEXT REFERENCES loja_clientes(id) ON DELETE SET NULL, pedido_numero TEXT NOT NULL UNIQUE CHECK (length(pedido_numero) BETWEEN 4 AND 40), desconto_centavos INTEGER NOT NULL CHECK (desconto_centavos >= 0), criado INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS loja_cupom_usos_cupom ON loja_cupom_usos(cupom_id, criado);
CREATE INDEX IF NOT EXISTS loja_cupom_usos_cliente ON loja_cupom_usos(cliente_id, cupom_id);
CREATE TABLE IF NOT EXISTS loja_carrinhos (cliente_id TEXT PRIMARY KEY REFERENCES loja_clientes(id) ON DELETE CASCADE, itens_json TEXT NOT NULL DEFAULT '[]' CHECK (length(itens_json) BETWEEN 2 AND 65536), quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade BETWEEN 0 AND 49950), total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (total_centavos >= 0), criado INTEGER NOT NULL, atualizado INTEGER NOT NULL, convertido_em INTEGER, pedido_numero TEXT CHECK (pedido_numero IS NULL OR length(pedido_numero) <= 40), lembrete_em INTEGER);
CREATE INDEX IF NOT EXISTS loja_carrinhos_atualizado ON loja_carrinhos(convertido_em, atualizado);
CREATE TABLE IF NOT EXISTS loja_cliente_leads (cliente_id TEXT PRIMARY KEY REFERENCES loja_clientes(id) ON DELETE CASCADE, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE, criado INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS loja_cliente_leads_lead ON loja_cliente_leads(lead_id);`;

/** Mesmo banco do ERP (erp_core), com as tabelas das contas (009) e da gestão (010) no espelho SQLite. */
export function gestaoDb() {
  const database = contasDb();
  database.registerSqliteSchema(gestaoSchema);
  return database;
}

export type Linha = Record<string, unknown>;
export const texto = (valor: unknown) => (valor === null || valor === undefined ? '' : String(valor));
export const iso = (valor: unknown) => new Date(Number(valor)).toISOString();
export const isoOuNulo = (valor: unknown) => (valor === null || valor === undefined ? null : iso(valor));
export const booleano = (valor: unknown) => Number(valor) === 1;
export const novoId = () => randomUUID();
export const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Trava consultiva da gestão (PostgreSQL): escritas do catálogo uma de cada vez, como o núcleo do ERP. */
export async function travarGestao(chave = 'loja-gestao') {
  const database = gestaoDb();
  if (database.backend === 'postgres') await database.prepare('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(?, 0))').get(chave);
}

/** Auditoria no mesmo registro do ERP (erp_audit), lido pelas notificações. */
export async function auditarGestao(ator: string, acao: string, recurso: string, id: string) {
  await gestaoDb().prepare('INSERT INTO erp_audit VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), ator.slice(0, 120), acao, recurso, id.slice(0, 120), Date.now());
}

/**
 * Desenvolvimento ligado a um DATABASE_URL remoto (que pode ser o de PRODUÇÃO): as escritas da loja e da
 * gestão do e-commerce recusam (503 GRAVACAO_DESLIGADA), no mesmo padrão das contas. Para gravar de
 * propósito nesse cenário: LOJA_GRAVAR_EM_DESENVOLVIMENTO=true (ou o antigo CONTAS_GRAVAR_EM_DESENVOLVIMENTO).
 */
export function gravacaoLojaPermitida(): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return true;
  if (storageConfiguration().backend !== 'postgres') return true;
  return process.env.LOJA_GRAVAR_EM_DESENVOLVIMENTO === 'true' || process.env.CONTAS_GRAVAR_EM_DESENVOLVIMENTO === 'true';
}
export function exigirGravacaoGestao() {
  if (!gravacaoLojaPermitida())
    throw new ApiError(503, 'Ambiente de desenvolvimento ligado ao banco remoto: a gestão da loja não grava aqui. Use o SQLite local ou LOJA_GRAVAR_EM_DESENVOLVIMENTO=true.', 'GRAVACAO_DESLIGADA');
}

// ---------------------------------------------------------------- Validação (ERP)

const CONTROLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function objeto(valor: unknown, rotulo = 'Dados'): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ApiError(400, `${rotulo}: informe um objeto válido.`, 'INVALID_INPUT');
  return valor as Record<string, unknown>;
}
export function permitidos(valor: Record<string, unknown>, campos: readonly string[]) {
  const extra = Object.keys(valor).filter((chave) => !campos.includes(chave));
  if (extra.length) throw new ApiError(400, `Campo não permitido: ${extra.join(', ')}.`, 'UNKNOWN_FIELD');
}
export function textoCampo(valor: unknown, rotulo: string, maximo: number, obrigatorio = false, multilinha = false): string {
  if (valor === undefined || valor === null) { if (obrigatorio) throw new ApiError(400, `${rotulo} é obrigatório.`, 'INVALID_INPUT'); return ''; }
  if (typeof valor !== 'string' || CONTROLE.test(multilinha ? valor.replace(/[\n\r\t]/g, ' ') : valor)) throw new ApiError(400, `${rotulo}: texto inválido.`, 'INVALID_INPUT');
  const limpo = multilinha ? valor.trim() : valor.replace(/\s+/g, ' ').trim();
  if ([...limpo].length > maximo) throw new ApiError(400, `${rotulo}: use até ${maximo} caracteres.`, 'INVALID_INPUT');
  if (obrigatorio && !limpo) throw new ApiError(400, `${rotulo} é obrigatório.`, 'INVALID_INPUT');
  return limpo;
}
export function slugCampo(valor: unknown, rotulo: string, maximo = 120): string {
  const slug = textoCampo(valor, rotulo, maximo, true);
  if (!SLUG.test(slug)) throw new ApiError(400, `${rotulo}: use letras minúsculas, números e hífens (ex.: kit-berco-jardim).`, 'INVALID_SLUG');
  return slug;
}
export function inteiroCampo(valor: unknown, rotulo: string, minimo: number, maximo: number): number {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < minimo || valor > maximo) throw new ApiError(400, `${rotulo}: informe um número inteiro entre ${minimo} e ${maximo}.`, 'INVALID_NUMBER');
  return valor;
}
export function inteiroOuNulo(valor: unknown, rotulo: string, minimo: number, maximo: number): number | null {
  return valor === null || valor === undefined ? null : inteiroCampo(valor, rotulo, minimo, maximo);
}
export function booleanoCampo(valor: unknown, rotulo: string): boolean {
  if (typeof valor !== 'boolean') throw new ApiError(400, `${rotulo}: informe verdadeiro ou falso.`, 'INVALID_INPUT');
  return valor;
}
export function opcaoCampo<T extends string>(valor: unknown, rotulo: string, opcoes: readonly T[]): T {
  if (typeof valor !== 'string' || !(opcoes as readonly string[]).includes(valor)) throw new ApiError(400, `${rotulo}: escolha ${opcoes.join(', ')}.`, 'INVALID_INPUT');
  return valor as T;
}
export function listaTextos(valor: unknown, rotulo: string, maximoItens: number, maximoTexto: number): string[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor) || valor.length > maximoItens) throw new ApiError(400, `${rotulo}: informe uma lista com até ${maximoItens} itens.`, 'INVALID_INPUT');
  return valor.map((item) => textoCampo(item, rotulo, maximoTexto, true, true));
}
export function listaIds(valor: unknown, rotulo: string, maximoItens = 200): string[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor) || valor.length > maximoItens || valor.some((item) => typeof item !== 'string' || !ID.test(item))) throw new ApiError(400, `${rotulo}: informe uma lista de identificadores (até ${maximoItens}).`, 'INVALID_INPUT');
  if (new Set(valor).size !== valor.length) throw new ApiError(400, `${rotulo}: há identificadores repetidos.`, 'INVALID_INPUT');
  return valor as string[];
}
/** Link do menu: caminho interno (/x) ou URL https. */
export function hrefCampo(valor: unknown, rotulo: string, obrigatorio = true): string {
  const href = textoCampo(valor, rotulo, 500, obrigatorio);
  if (!href) return '';
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try { const url = new URL(href); if (url.protocol === 'https:' && !url.username && !url.password) return url.toString(); } catch { /* inválido */ }
  throw new ApiError(400, `${rotulo}: use um caminho da loja (/kit-berco) ou um endereço https.`, 'INVALID_URL');
}
/**
 * Imagem de categoria/menu: só arquivo da própria loja (/vitrine/…), que o next/image já aceita; endereço
 * externo exigiria liberar o domínio em next.config (images.remotePatterns).
 */
export function imagemCampo(valor: unknown, rotulo: string): string {
  const caminho = textoCampo(valor, rotulo, 500);
  if (!caminho) return '';
  if (!/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|avif)$/.test(caminho) || caminho.includes('..')) throw new ApiError(400, `${rotulo}: use um arquivo da loja, como /vitrine/menu/kit-berco/kits.webp.`, 'INVALID_IMAGE');
  return caminho;
}
export function revisaoCampo(valor: unknown): number {
  if (!Number.isSafeInteger(valor) || Number(valor) < 1) throw new ApiError(400, 'Informe a versão atual do registro (revisao).', 'REVISION_REQUIRED');
  return Number(valor);
}
export const conflito = () => new ApiError(409, 'Este registro foi alterado por outra pessoa. Atualize a página e tente novamente.', 'REVISION_CONFLICT');
export const naoEncontrado = (oque = 'Registro') => new ApiError(404, `${oque} não encontrado.`, 'NOT_FOUND');

export function paginacao(url: URL, padrao = 50, maximo = 200) {
  const limite = Number(url.searchParams.get('limit') ?? padrao), offset = Number(url.searchParams.get('offset') ?? 0);
  if (!Number.isSafeInteger(limite) || limite < 1 || limite > maximo || !Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000)
    throw new ApiError(400, `Limit deve ser entre 1 e ${maximo}; offset entre 0 e 1000000.`, 'INVALID_PAGINATION');
  return { limite, offset };
}
export const escaparLike = (valor: string) => valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
export function buscaDaUrl(url: URL) {
  const termo = (url.searchParams.get('busca') ?? '').replace(CONTROLE, '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (termo.length > 100) throw new ApiError(400, 'Busca muito longa.', 'INVALID_FILTER');
  return termo;
}
export function json<T>(valor: unknown, padrao: T): T {
  try { return JSON.parse(texto(valor)) as T; } catch { return padrao; }
}
