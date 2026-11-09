import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiError, type Actor } from '../../erp/access.ts';
import type { CategoriaGestao, NoCategoriaGestao, RespostaCategorias, RespostaImagensLoja } from './tipos.ts';
import {
  auditarGestao, booleano, booleanoCampo, conflito, exigirGravacaoGestao, gestaoDb, imagemCampo, inteiroCampo, iso, type Linha, listaIds, naoEncontrado, novoId, objeto, permitidos,
  revisaoCampo, slugCampo, textoCampo, texto, travarGestao,
} from './esquema.ts';

// Categorias da loja (árvore). O `caminho` ("kit-berco/kits") é a URL da listagem e a chave do motor de
// URLs: é recalculado aqui (mãe + slug) e propagado às filhas quando o slug ou a mãe mudam.

const PROFUNDIDADE_MAXIMA = 4;
// Primeiro segmento que já é rota da loja: uma categoria raiz com esse slug ficaria escondida.
const RAIZES_RESERVADAS = new Set(['produto', 'busca', 'conta', 'carrinho', 'checkout', 'api', 'pronta-entrega', 'edicao-do-mes', 'ajuda', 'politicas', 'sobre', 'indique', 'dev', 'personalizado', 'colecao']);

function categoriaGestao(linha: Linha): CategoriaGestao {
  return {
    id: texto(linha.id), paiId: linha.pai_id ? texto(linha.pai_id) : null, slug: texto(linha.slug), caminho: texto(linha.caminho), nome: texto(linha.nome), descricao: texto(linha.descricao),
    imagem: texto(linha.imagem), ordem: Number(linha.ordem), ativa: booleano(linha.ativa), seoTitulo: texto(linha.seo_titulo), seoDescricao: texto(linha.seo_descricao),
    produtos: Number(linha.produtos ?? 0), revisao: Number(linha.revisao), criadoEm: iso(linha.criado), atualizadoEm: iso(linha.atualizado),
  };
}

const SELECT = 'SELECT c.*, (SELECT COUNT(*) FROM loja_produtos p WHERE p.categoria_id = c.id) AS produtos FROM loja_categorias c';

export async function listarCategorias(): Promise<RespostaCategorias> {
  const categorias = (await gestaoDb().prepare(`${SELECT} ORDER BY c.ordem, c.caminho`).all()).map(categoriaGestao);
  const nos = new Map<string, NoCategoriaGestao>(categorias.map((categoria) => [categoria.id, { ...categoria, filhos: [] }]));
  const arvore: NoCategoriaGestao[] = [];
  for (const no of nos.values()) (no.paiId && nos.get(no.paiId) ? nos.get(no.paiId)!.filhos : arvore).push(no);
  // Lista plana na ordem da árvore (mãe antes das filhas).
  const plana: CategoriaGestao[] = [];
  const visitar = (lista: NoCategoriaGestao[]) => { for (const { filhos, ...categoria } of lista) { plana.push(categoria); visitar(filhos); } };
  visitar(arvore);
  return { categorias: plana, arvore };
}

async function linhaCategoria(id: string) {
  const linha = await gestaoDb().prepare(`${SELECT} WHERE c.id = ?`).get(id);
  if (!linha) throw naoEncontrado('Categoria');
  return linha;
}
export async function obterCategoria(id: string) { return { categoria: categoriaGestao(await linhaCategoria(id)) }; }

const CAMPOS = ['paiId', 'slug', 'nome', 'descricao', 'imagem', 'ordem', 'ativa', 'seoTitulo', 'seoDescricao'] as const;

async function caminhoPara(paiId: string | null, slug: string, propria?: string) {
  if (!paiId) {
    if (RAIZES_RESERVADAS.has(slug)) throw new ApiError(400, `"${slug}" já é uma página da loja: escolha outro slug para a categoria principal.`, 'RESERVED_SLUG');
    return slug;
  }
  const pai = await gestaoDb().prepare('SELECT id, caminho FROM loja_categorias WHERE id = ?').get(paiId);
  if (!pai) throw new ApiError(400, 'Categoria-mãe não encontrada.', 'INVALID_PARENT');
  const caminho = `${texto(pai.caminho)}/${slug}`;
  if (caminho.split('/').length > PROFUNDIDADE_MAXIMA) throw new ApiError(400, `A árvore tem até ${PROFUNDIDADE_MAXIMA} níveis.`, 'TOO_DEEP');
  if (propria && (texto(pai.caminho) === propria || texto(pai.caminho).startsWith(`${propria}/`))) throw new ApiError(400, 'A categoria não pode ficar dentro dela mesma.', 'INVALID_PARENT');
  return caminho;
}

export async function criarCategoria(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  permitidos(entrada, CAMPOS);
  const paiId = entrada.paiId === undefined || entrada.paiId === null ? null : texto(listaIds([entrada.paiId], 'Categoria-mãe')[0]);
  const slug = slugCampo(entrada.slug, 'Slug', 60), nome = textoCampo(entrada.nome, 'Nome', 80, true);
  const database = gestaoDb(), id = novoId(), agora = Date.now();
  await database.transaction(async () => {
    await travarGestao();
    const caminho = await caminhoPara(paiId, slug);
    if (await database.prepare('SELECT id FROM loja_categorias WHERE caminho = ?').get(caminho)) throw new ApiError(409, 'Já existe uma categoria com esse endereço.', 'DUPLICATE_SLUG');
    const ordem = entrada.ordem === undefined
      ? Number((await database.prepare(`SELECT COALESCE(MAX(ordem), -10) + 10 AS proxima FROM loja_categorias WHERE ${paiId ? 'pai_id = ?' : 'pai_id IS NULL'}`).get(...(paiId ? [paiId] : [])))?.proxima ?? 0)
      : inteiroCampo(entrada.ordem, 'Ordem', 0, 100_000);
    await database.prepare('INSERT INTO loja_categorias (id, pai_id, slug, caminho, nome, descricao, imagem, ordem, ativa, seo_titulo, seo_descricao, revisao, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)').run(
      id, paiId, slug, caminho, nome, textoCampo(entrada.descricao, 'Descrição', 2000, false, true), imagemCampo(entrada.imagem, 'Imagem'), Math.min(ordem, 100_000),
      entrada.ativa === undefined ? 1 : booleanoCampo(entrada.ativa, 'Ativa') ? 1 : 0, textoCampo(entrada.seoTitulo, 'Título SEO', 70), textoCampo(entrada.seoDescricao, 'Descrição SEO', 170), agora, agora,
    );
    await auditarGestao(ator.id, 'created', 'loja_categorias', id);
  });
  return obterCategoria(id);
}

export async function atualizarCategoria(id: string, entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao);
  permitidos(campos, CAMPOS);
  const database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaCategoria(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const paiId = campos.paiId === undefined ? (atual.pai_id ? texto(atual.pai_id) : null) : campos.paiId === null ? null : texto(listaIds([campos.paiId], 'Categoria-mãe')[0]);
    if (paiId === id) throw new ApiError(400, 'A categoria não pode ficar dentro dela mesma.', 'INVALID_PARENT');
    const slug = campos.slug === undefined ? texto(atual.slug) : slugCampo(campos.slug, 'Slug', 60);
    const antigo = texto(atual.caminho);
    const caminho = paiId === (atual.pai_id ? texto(atual.pai_id) : null) && slug === texto(atual.slug) ? antigo : await caminhoPara(paiId, slug, antigo);
    if (caminho !== antigo) {
      if (await database.prepare('SELECT id FROM loja_categorias WHERE caminho = ? AND id <> ?').get(caminho, id)) throw new ApiError(409, 'Já existe uma categoria com esse endereço.', 'DUPLICATE_SLUG');
      const descendentes = await database.prepare("SELECT id, caminho FROM loja_categorias WHERE caminho LIKE ? ESCAPE '\\'").all(`${antigo.replace(/[\\%_]/g, (c) => `\\${c}`)}/%`);
      const profundidade = caminho.split('/').length - antigo.split('/').length;
      if (descendentes.some((linha) => texto(linha.caminho).split('/').length + profundidade > PROFUNDIDADE_MAXIMA)) throw new ApiError(400, `A árvore tem até ${PROFUNDIDADE_MAXIMA} níveis.`, 'TOO_DEEP');
      for (const linha of descendentes) await database.prepare('UPDATE loja_categorias SET caminho = ?, atualizado = ? WHERE id = ?').run(`${caminho}${texto(linha.caminho).slice(antigo.length)}`, Date.now(), texto(linha.id));
    }
    await database.prepare('UPDATE loja_categorias SET pai_id = ?, slug = ?, caminho = ?, nome = ?, descricao = ?, imagem = ?, ordem = ?, ativa = ?, seo_titulo = ?, seo_descricao = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?').run(
      paiId, slug, caminho,
      campos.nome === undefined ? texto(atual.nome) : textoCampo(campos.nome, 'Nome', 80, true),
      campos.descricao === undefined ? texto(atual.descricao) : textoCampo(campos.descricao, 'Descrição', 2000, false, true),
      campos.imagem === undefined ? texto(atual.imagem) : imagemCampo(campos.imagem, 'Imagem'),
      campos.ordem === undefined ? Number(atual.ordem) : inteiroCampo(campos.ordem, 'Ordem', 0, 100_000),
      campos.ativa === undefined ? Number(atual.ativa) : booleanoCampo(campos.ativa, 'Ativa') ? 1 : 0,
      campos.seoTitulo === undefined ? texto(atual.seo_titulo) : textoCampo(campos.seoTitulo, 'Título SEO', 70),
      campos.seoDescricao === undefined ? texto(atual.seo_descricao) : textoCampo(campos.seoDescricao, 'Descrição SEO', 170),
      Date.now(), id, esperada,
    );
    await auditarGestao(ator.id, 'updated', 'loja_categorias', id);
  });
  return obterCategoria(id);
}

/** Só sem filhas e sem produtos com ela como principal (as categorias extras saem junto). */
export async function removerCategoria(id: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const esperada = revisaoCampo(revisaoBruta), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaCategoria(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    if (await database.prepare('SELECT id FROM loja_categorias WHERE pai_id = ? LIMIT 1').get(id)) throw new ApiError(409, 'Mova ou remova as subcategorias antes.', 'CATEGORY_HAS_CHILDREN');
    if (Number(atual.produtos) > 0) throw new ApiError(409, 'Há produtos nesta categoria: troque a categoria deles antes (ou desative a categoria).', 'CATEGORY_IN_USE');
    await database.prepare('DELETE FROM loja_categorias WHERE id = ?').run(id);
    await auditarGestao(ator.id, 'removed', 'loja_categorias', id);
  });
  return { removida: true };
}

/** PUT {paiId, ids}: as irmãs na nova ordem (todas, uma vez cada). */
export async function ordenarCategorias(entradaBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  permitidos(entrada, ['paiId', 'ids']);
  const paiId = entrada.paiId === undefined || entrada.paiId === null ? null : texto(listaIds([entrada.paiId], 'Categoria-mãe')[0]);
  const ids = listaIds(entrada.ids, 'Categorias', 500), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const irmas = (await database.prepare(`SELECT id FROM loja_categorias WHERE ${paiId ? 'pai_id = ?' : 'pai_id IS NULL'}`).all(...(paiId ? [paiId] : []))).map((linha) => texto(linha.id));
    if (irmas.length !== ids.length || irmas.some((irma) => !ids.includes(irma))) throw new ApiError(400, 'Informe todas as categorias deste nível uma única vez.', 'INVALID_ORDER');
    for (const [posicao, idCategoria] of ids.entries()) await database.prepare('UPDATE loja_categorias SET ordem = ?, revisao = revisao + 1, atualizado = ? WHERE id = ?').run(posicao * 10, Date.now(), idCategoria);
    await auditarGestao(ator.id, 'reordered', 'loja_categorias', paiId ?? 'raiz');
  });
  return listarCategorias();
}

// ---------------------------------------------------------------- Imagens da loja (categorias e menu)

const IMAGEM_LOJA = /^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|avif)$/;

/**
 * Arquivos que o ERP pode escolher como imagem de categoria e do menu: os de public/vitrine (quando a pasta
 * está no servidor; na Vercel os estáticos podem não estar no disco da função) e os que já estão em uso.
 * Mesma regra de imagemCampo: só /vitrine/… raster, sem endereço externo.
 */
export async function imagensDaLoja(raiz = join(process.cwd(), 'public')): Promise<RespostaImagensLoja> {
  const database = gestaoDb();
  const emUso = new Set([
    ...(await database.prepare("SELECT imagem FROM loja_categorias WHERE imagem <> ''").all()),
    ...(await database.prepare("SELECT imagem FROM loja_menu_itens WHERE imagem <> ''").all()),
  ].map((linha) => texto(linha.imagem)));
  let arquivos: string[] = [];
  try {
    arquivos = (await readdir(join(raiz, 'vitrine'), { recursive: true }))
      .map((arquivo) => `/vitrine/${String(arquivo).split('\\').join('/')}`)
      .filter((caminho) => IMAGEM_LOJA.test(caminho) && !caminho.includes('..'));
  } catch { /* pasta ausente no servidor: só as em uso */ }
  const caminhos = [...new Set([...arquivos, ...emUso])].filter((caminho) => IMAGEM_LOJA.test(caminho)).sort((a, b) => a.localeCompare(b)).slice(0, 2000);
  return { imagens: caminhos.map((caminho) => ({ caminho, emUso: emUso.has(caminho) })) };
}
