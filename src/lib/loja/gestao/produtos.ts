import { ApiError, type Actor } from '../../erp/access.ts';
import type { Disponibilidade, EntradaDuplicar, GrupoFichaGestao, OrdenacaoProdutos, ProdutoGestao, ProdutoResumoGestao, ReferenciaProduto, RespostaProdutos, StatusProduto } from './tipos.ts';
import { imagensDoProduto, liberarObjetosDasImagens } from './imagens.ts';
import {deleteImageVariants,variantsDb,variantsTable} from '../../storage/variants.ts';
import {
  auditarGestao, booleano, booleanoCampo, buscaDaUrl, conflito, escaparLike, exigirGravacaoGestao, gestaoDb, ID, inteiroCampo, inteiroOuNulo, iso, json, type Linha, listaIds, listaTextos,
  naoEncontrado, novoId, objeto, opcaoCampo, paginacao, permitidos, revisaoCampo, SLUG, slugCampo, textoCampo, texto, travarGestao,
} from './esquema.ts';

// Produtos da loja no ERP: cadastro, edição com revisão, duplicar, arquivar e remover (só rascunho ou
// arquivado). A loja lê só os ATIVOS (src/lib/loja/gestao/catalogoBanco.ts). Fotos: imagens.ts.

const STATUS: readonly StatusProduto[] = ['rascunho', 'ativo', 'arquivado'];
const DISPONIBILIDADES: readonly Disponibilidade[] = ['pronta_entrega', 'sob_encomenda'];
const SKU = /^[A-Z0-9][A-Z0-9._-]{0,39}$/;
// Facetas derivadas: `entrega` vem da disponibilidade e `retirada` da pronta entrega.
const ATRIBUTOS_DERIVADOS = new Set(['entrega', 'retirada']);
const MAX_PRECO = 100_000_000;

const CAMPOS = [
  'slug', 'sku', 'nome', 'marca', 'resumo', 'descricao', 'precoCentavos', 'precoDeCentavos', 'unidade', 'selo', 'pecas', 'personalizacao', 'ficha', 'atributos', 'disponibilidade',
  'prazoMinDias', 'prazoMaxDias', 'status', 'destaque', 'categoriaId', 'categoriasExtras', 'linhaCores', 'cor', 'ordem', 'complementos', 'semelhantes', 'grupos', 'seoTitulo', 'seoDescricao',
] as const;

function fichaCampo(valor: unknown): GrupoFichaGestao[] {
  if (!Array.isArray(valor) || valor.length > 20) throw new ApiError(400, 'Ficha técnica: informe até 20 grupos.', 'INVALID_INPUT');
  return valor.map((grupoBruto) => {
    const grupo = objeto(grupoBruto, 'Grupo da ficha');
    permitidos(grupo, ['titulo', 'itens']);
    if (!Array.isArray(grupo.itens) || grupo.itens.length > 40) throw new ApiError(400, 'Ficha técnica: até 40 linhas por grupo.', 'INVALID_INPUT');
    return {
      titulo: textoCampo(grupo.titulo, 'Título do grupo da ficha', 80, true),
      itens: grupo.itens.map((item) => {
        if (!Array.isArray(item) || item.length !== 2) throw new ApiError(400, 'Ficha técnica: cada linha é [rótulo, valor].', 'INVALID_INPUT');
        return [textoCampo(item[0], 'Rótulo da ficha', 80, true), textoCampo(item[1], 'Valor da ficha', 500, true, true)] as [string, string];
      }),
    };
  });
}

function atributosCampo(valor: unknown): Record<string, string[]> {
  const atributos = objeto(valor, 'Atributos');
  const chaves = Object.keys(atributos).filter((chave) => !ATRIBUTOS_DERIVADOS.has(chave));
  if (chaves.length > 20) throw new ApiError(400, 'Atributos: até 20 facetas.', 'INVALID_INPUT');
  return Object.fromEntries(chaves.map((chave) => {
    if (!/^[a-z][a-z0-9]{0,29}$/.test(chave)) throw new ApiError(400, `Atributo "${chave}": use letras minúsculas e números (ex.: cor, tecido).`, 'INVALID_INPUT');
    const valores = listaTextos(atributos[chave], `Atributo ${chave}`, 20, 60);
    return [chave, [...new Set(valores)]];
  }));
}

type Dados = {
  slug: string; sku: string; nome: string; marca: string; resumo: string; descricao: string[]; preco: number; precoDe: number | null; unidade: string; selo: string; pecas: string[];
  personalizacao: string; ficha: GrupoFichaGestao[]; atributos: Record<string, string[]>; disponibilidade: Disponibilidade; prazoMin: number | null; prazoMax: number | null; status: StatusProduto;
  destaque: boolean; categoriaId: string; linhaCores: string; cor: string; ordem: number | null; seoTitulo: string; seoDescricao: string;
  extras?: string[]; complementos?: string[]; semelhantes?: string[]; grupos?: string[];
};

function validar(campos: Record<string, unknown>, atual?: Linha): Dados {
  permitidos(campos, CAMPOS);
  const tem = (campo: string) => campos[campo] !== undefined;
  const sku = tem('sku') ? textoCampo(campos.sku, 'SKU', 40, true).toUpperCase() : texto(atual?.sku);
  if (!SKU.test(sku)) throw new ApiError(400, 'SKU: use letras maiúsculas, números, ponto, hífen ou sublinhado (ex.: MK-1001).', 'INVALID_SKU');
  const preco = tem('precoCentavos') ? inteiroCampo(campos.precoCentavos, 'Preço', 0, MAX_PRECO) : Number(atual?.preco_centavos);
  if (!Number.isSafeInteger(preco)) throw new ApiError(400, 'Preço é obrigatório.', 'INVALID_NUMBER');
  const precoDe = tem('precoDeCentavos') ? inteiroOuNulo(campos.precoDeCentavos, 'Preço "de"', 1, MAX_PRECO) : (atual?.preco_de_centavos ?? null) === null ? null : Number(atual?.preco_de_centavos);
  if (precoDe !== null && precoDe <= preco) throw new ApiError(400, 'O preço "de" precisa ser maior que o preço.', 'INVALID_NUMBER');
  const prazoMin = tem('prazoMinDias') ? inteiroOuNulo(campos.prazoMinDias, 'Prazo mínimo', 0, 365) : (atual?.prazo_min_dias ?? null) === null ? null : Number(atual?.prazo_min_dias);
  const prazoMax = tem('prazoMaxDias') ? inteiroOuNulo(campos.prazoMaxDias, 'Prazo máximo', 0, 365) : (atual?.prazo_max_dias ?? null) === null ? null : Number(atual?.prazo_max_dias);
  if ((prazoMin === null) !== (prazoMax === null)) throw new ApiError(400, 'Informe o prazo mínimo e o máximo juntos (ou nenhum).', 'INVALID_INPUT');
  if (prazoMin !== null && prazoMax !== null && prazoMin > prazoMax) throw new ApiError(400, 'O prazo mínimo não pode passar do máximo.', 'INVALID_INPUT');
  const linhaCores = tem('linhaCores') ? textoCampo(campos.linhaCores, 'Linha de cores', 80) : texto(atual?.linha_cores);
  if (linhaCores && !SLUG.test(linhaCores)) throw new ApiError(400, 'Linha de cores: use um identificador em minúsculas com hífens (ex.: kit-berco-jardim).', 'INVALID_INPUT');
  const cor = tem('cor') ? textoCampo(campos.cor, 'Cor', 40) : texto(atual?.cor);
  if (linhaCores && !cor) throw new ApiError(400, 'Informe a cor desta peça para a linha de cores.', 'INVALID_INPUT');
  const categoriaId = tem('categoriaId') ? listaIds([campos.categoriaId], 'Categoria')[0] : texto(atual?.categoria_id);
  if (!categoriaId) throw new ApiError(400, 'Categoria é obrigatória.', 'INVALID_INPUT');
  return {
    slug: tem('slug') ? slugCampo(campos.slug, 'Slug', 120) : texto(atual?.slug),
    sku, preco, precoDe, prazoMin, prazoMax, linhaCores, cor, categoriaId,
    nome: tem('nome') ? textoCampo(campos.nome, 'Nome', 160, true) : texto(atual?.nome),
    marca: tem('marca') ? textoCampo(campos.marca, 'Marca', 80, true) : texto(atual?.marca) || 'Milena Kerbage',
    resumo: tem('resumo') ? textoCampo(campos.resumo, 'Resumo', 500, false, true) : texto(atual?.resumo),
    descricao: tem('descricao') ? listaTextos(campos.descricao, 'Descrição (parágrafos)', 10, 2000) : json<string[]>(atual?.descricao_json, []),
    unidade: tem('unidade') ? textoCampo(campos.unidade, 'Unidade', 60, true) : texto(atual?.unidade) || 'peça',
    selo: tem('selo') ? textoCampo(campos.selo, 'Selo', 40) : texto(atual?.selo),
    pecas: tem('pecas') ? listaTextos(campos.pecas, 'Peças do kit', 30, 200) : json<string[]>(atual?.pecas_json, []),
    personalizacao: tem('personalizacao') ? textoCampo(campos.personalizacao, 'Personalização', 300) : texto(atual?.personalizacao),
    ficha: tem('ficha') ? fichaCampo(campos.ficha) : json<GrupoFichaGestao[]>(atual?.ficha_json, []),
    atributos: tem('atributos') ? atributosCampo(campos.atributos) : json<Record<string, string[]>>(atual?.atributos_json, {}),
    disponibilidade: tem('disponibilidade') ? opcaoCampo(campos.disponibilidade, 'Disponibilidade', DISPONIBILIDADES) : ((texto(atual?.disponibilidade) || 'sob_encomenda') as Disponibilidade),
    status: tem('status') ? opcaoCampo(campos.status, 'Situação', STATUS) : ((texto(atual?.status) || 'rascunho') as StatusProduto),
    destaque: tem('destaque') ? booleanoCampo(campos.destaque, 'Destaque') : booleano(atual?.destaque),
    ordem: tem('ordem') ? inteiroCampo(campos.ordem, 'Ordem', 0, 1_000_000) : atual ? Number(atual.ordem) : null,
    seoTitulo: tem('seoTitulo') ? textoCampo(campos.seoTitulo, 'Título SEO', 70) : texto(atual?.seo_titulo),
    seoDescricao: tem('seoDescricao') ? textoCampo(campos.seoDescricao, 'Descrição SEO', 170) : texto(atual?.seo_descricao),
    ...(tem('categoriasExtras') ? { extras: listaIds(campos.categoriasExtras, 'Categorias extras', 10) } : {}),
    ...(tem('complementos') ? { complementos: listaIds(campos.complementos, 'Complementos', 12) } : {}),
    ...(tem('semelhantes') ? { semelhantes: listaIds(campos.semelhantes, 'Semelhantes', 12) } : {}),
    ...(tem('grupos') ? { grupos: listaIds(campos.grupos, 'Grupos de opções', 5) } : {}),
  };
}

async function conferirReferencias(id: string, dados: Dados) {
  const database = gestaoDb();
  if (!await database.prepare('SELECT id FROM loja_categorias WHERE id = ?').get(dados.categoriaId)) throw new ApiError(400, 'Categoria não encontrada.', 'INVALID_CATEGORY');
  if (await database.prepare('SELECT id FROM loja_produtos WHERE slug = ? AND id <> ?').get(dados.slug, id)) throw new ApiError(409, 'Já existe um produto com esse slug.', 'DUPLICATE_SLUG');
  if (await database.prepare('SELECT id FROM loja_produtos WHERE sku = ? AND id <> ?').get(dados.sku, id)) throw new ApiError(409, 'Já existe um produto com esse SKU.', 'DUPLICATE_SKU');
  for (const extra of dados.extras ?? []) {
    if (extra === dados.categoriaId) throw new ApiError(400, 'A categoria principal não entra nas extras.', 'INVALID_CATEGORY');
    if (!await database.prepare('SELECT id FROM loja_categorias WHERE id = ?').get(extra)) throw new ApiError(400, 'Categoria extra não encontrada.', 'INVALID_CATEGORY');
  }
  for (const relacionado of [...(dados.complementos ?? []), ...(dados.semelhantes ?? [])]) {
    if (relacionado === id) throw new ApiError(400, 'O produto não pode ser relacionado a ele mesmo.', 'INVALID_RELATION');
    if (!await database.prepare('SELECT id FROM loja_produtos WHERE id = ?').get(relacionado)) throw new ApiError(400, 'Produto relacionado não encontrado.', 'INVALID_RELATION');
  }
  if (dados.grupos) {
    const tipos: string[] = [];
    for (const grupo of dados.grupos) {
      const linha = await database.prepare('SELECT tipo FROM loja_grupos_opcoes WHERE id = ?').get(grupo);
      if (!linha) throw new ApiError(400, 'Grupo de opções não encontrado.', 'INVALID_GROUP');
      tipos.push(texto(linha.tipo));
    }
    // A página de produto mostra uma escolha (seletor) e uma personalização (com/sem bordado).
    if (tipos.filter((tipo) => tipo === 'escolha').length > 1 || tipos.filter((tipo) => tipo === 'personalizacao').length > 1)
      throw new ApiError(400, 'Use no máximo um grupo de escolha e um de personalização por produto.', 'INVALID_GROUP');
  }
}

async function gravarRelacoes(id: string, dados: Dados) {
  const database = gestaoDb();
  if (dados.extras) {
    await database.prepare('DELETE FROM loja_produto_categorias WHERE produto_id = ?').run(id);
    for (const extra of dados.extras) await database.prepare('INSERT INTO loja_produto_categorias (produto_id, categoria_id) VALUES (?, ?)').run(id, extra);
  }
  for (const tipo of ['complemento', 'semelhante'] as const) {
    const lista = tipo === 'complemento' ? dados.complementos : dados.semelhantes;
    if (!lista) continue;
    await database.prepare('DELETE FROM loja_produto_relacionados WHERE produto_id = ? AND tipo = ?').run(id, tipo);
    for (const [ordem, relacionado] of lista.entries()) await database.prepare('INSERT INTO loja_produto_relacionados (produto_id, relacionado_id, tipo, ordem) VALUES (?, ?, ?, ?)').run(id, relacionado, tipo, ordem);
  }
  if (dados.grupos) {
    await database.prepare('DELETE FROM loja_produto_grupos WHERE produto_id = ?').run(id);
    for (const [ordem, grupo] of dados.grupos.entries()) await database.prepare('INSERT INTO loja_produto_grupos (produto_id, grupo_id, ordem) VALUES (?, ?, ?)').run(id, grupo, ordem);
  }
}

const SELECT_RESUMO = `SELECT p.*, c.nome AS categoria_nome, c.caminho AS categoria_caminho,
  (SELECT i.id FROM loja_produto_imagens i WHERE i.produto_id = p.id ORDER BY i.posicao LIMIT 1) AS imagem_id,
  (SELECT i.hash FROM loja_produto_imagens i WHERE i.produto_id = p.id ORDER BY i.posicao LIMIT 1) AS imagem_hash
  FROM loja_produtos p JOIN loja_categorias c ON c.id = p.categoria_id`;

function resumo(linha: Linha): ProdutoResumoGestao {
  return {
    id: texto(linha.id), slug: texto(linha.slug), sku: texto(linha.sku), nome: texto(linha.nome), precoCentavos: Number(linha.preco_centavos),
    precoDeCentavos: linha.preco_de_centavos === null || linha.preco_de_centavos === undefined ? null : Number(linha.preco_de_centavos),
    status: texto(linha.status) as StatusProduto, disponibilidade: texto(linha.disponibilidade) as Disponibilidade, destaque: booleano(linha.destaque), selo: texto(linha.selo),
    categoriaId: texto(linha.categoria_id), categoriaNome: texto(linha.categoria_nome), caminho: `/${texto(linha.categoria_caminho)}`, ordem: Number(linha.ordem),
    imagem: linha.imagem_id ? `/api/erp/loja/produtos/${texto(linha.id)}/imagens/${texto(linha.imagem_id)}?tamanho=mini&v=${texto(linha.imagem_hash).slice(0, 12)}` : null,
    revisao: Number(linha.revisao), atualizadoEm: iso(linha.atualizado),
  };
}

// ?ordenar= da lista do ERP (o desempate mantém a ordem da loja).
const ORDENACOES: Record<OrdenacaoProdutos, string> = {
  ordem: 'p.ordem, p.criado, p.slug', nome: 'LOWER(p.nome), p.slug', preco: 'p.preco_centavos, p.ordem, p.slug', '-preco': 'p.preco_centavos DESC, p.ordem, p.slug',
  recentes: 'p.atualizado DESC, p.slug', sku: 'p.sku',
};

/** ?status=todos|rascunho|ativo|arquivado&categoria=<id>&disponibilidade=&colecao=<id>&ordenar=&busca=&limit&offset */
export async function listarProdutosGestao(url: URL): Promise<RespostaProdutos> {
  const { limite, offset } = paginacao(url, 50, 200), termo = buscaDaUrl(url);
  const status = url.searchParams.get('status') ?? 'todos';
  if (status !== 'todos' && !(STATUS as readonly string[]).includes(status)) throw new ApiError(400, 'Filtro de situação inválido.', 'INVALID_FILTER');
  const disponibilidade = url.searchParams.get('disponibilidade');
  if (disponibilidade && !(DISPONIBILIDADES as readonly string[]).includes(disponibilidade)) throw new ApiError(400, 'Filtro de disponibilidade inválido.', 'INVALID_FILTER');
  const categoria = url.searchParams.get('categoria');
  const condicoes: string[] = [], parametros: (string | number)[] = [];
  if (status !== 'todos') { condicoes.push('p.status = ?'); parametros.push(status); }
  if (disponibilidade) { condicoes.push('p.disponibilidade = ?'); parametros.push(disponibilidade); }
  if (categoria) {
    if (!ID.test(categoria)) throw new ApiError(400, 'Filtro de categoria inválido.', 'INVALID_FILTER');
    const alvo = await gestaoDb().prepare('SELECT caminho FROM loja_categorias WHERE id = ?').get(categoria);
    if (!alvo) throw new ApiError(400, 'Categoria não encontrada.', 'INVALID_FILTER');
    condicoes.push("(c.caminho = ? OR c.caminho LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM loja_produto_categorias pc JOIN loja_categorias e ON e.id = pc.categoria_id WHERE pc.produto_id = p.id AND (e.caminho = ? OR e.caminho LIKE ? ESCAPE '\\')))");
    const caminho = texto(alvo.caminho), prefixo = `${escaparLike(caminho)}/%`;
    parametros.push(caminho, prefixo, caminho, prefixo);
  }
  const colecao = url.searchParams.get('colecao');
  if (colecao) {
    if (!ID.test(colecao)) throw new ApiError(400, 'Filtro de coleção inválido.', 'INVALID_FILTER');
    condicoes.push('EXISTS (SELECT 1 FROM loja_colecao_produtos cp WHERE cp.produto_id = p.id AND cp.colecao_id = ?)');
    parametros.push(colecao);
  }
  const ordenar = (url.searchParams.get('ordenar') ?? 'ordem') as OrdenacaoProdutos;
  if (!Object.hasOwn(ORDENACOES, ordenar)) throw new ApiError(400, 'Ordenação inválida.', 'INVALID_FILTER');
  if (termo) { condicoes.push("(LOWER(p.nome) LIKE ? ESCAPE '\\' OR LOWER(p.sku) LIKE ? ESCAPE '\\' OR p.slug LIKE ? ESCAPE '\\')"); parametros.push(...Array(3).fill(`%${escaparLike(termo)}%`)); }
  const onde = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '', database = gestaoDb();
  const total = Number((await database.prepare(`SELECT COUNT(*) AS total FROM loja_produtos p JOIN loja_categorias c ON c.id = p.categoria_id${onde}`).get(...parametros))?.total ?? 0);
  const linhas = await database.prepare(`${SELECT_RESUMO}${onde} ORDER BY ${ORDENACOES[ordenar]} LIMIT ? OFFSET ?`).all(...parametros, limite, offset);
  const contagem: Record<StatusProduto, number> = { rascunho: 0, ativo: 0, arquivado: 0 };
  for (const linha of await database.prepare('SELECT status, COUNT(*) AS total FROM loja_produtos GROUP BY status').all()) contagem[texto(linha.status) as StatusProduto] = Number(linha.total);
  return { produtos: linhas.map(resumo), contagem, pagination: { limit: limite, offset, total, hasMore: offset + linhas.length < total } };
}

async function linhaProduto(id: string) {
  if (typeof id !== 'string' || !ID.test(id)) throw naoEncontrado('Produto');
  const linha = await gestaoDb().prepare(`${SELECT_RESUMO} WHERE p.id = ?`).get(id);
  if (!linha) throw naoEncontrado('Produto');
  return linha;
}

export async function obterProduto(id: string, origemLoja = ''): Promise<{ produto: ProdutoGestao }> {
  const linha = await linhaProduto(id), database = gestaoDb();
  const referencias = async (tipo: string): Promise<ReferenciaProduto[]> =>
    (await database.prepare('SELECT p.id, p.slug, p.nome FROM loja_produto_relacionados r JOIN loja_produtos p ON p.id = r.relacionado_id WHERE r.produto_id = ? AND r.tipo = ? ORDER BY r.ordem').all(id, tipo))
      .map((item) => ({ id: texto(item.id), slug: texto(item.slug), nome: texto(item.nome) }));
  const grupos = await database.prepare('SELECT g.id, g.nome, g.tipo, pg.ordem FROM loja_produto_grupos pg JOIN loja_grupos_opcoes g ON g.id = pg.grupo_id WHERE pg.produto_id = ? ORDER BY pg.ordem').all(id);
  return {
    produto: {
      ...resumo(linha),
      marca: texto(linha.marca), resumo: texto(linha.resumo), descricao: json<string[]>(linha.descricao_json, []), unidade: texto(linha.unidade), pecas: json<string[]>(linha.pecas_json, []),
      personalizacao: texto(linha.personalizacao), ficha: json<GrupoFichaGestao[]>(linha.ficha_json, []), atributos: json<Record<string, string[]>>(linha.atributos_json, {}),
      prazoMinDias: linha.prazo_min_dias === null || linha.prazo_min_dias === undefined ? null : Number(linha.prazo_min_dias),
      prazoMaxDias: linha.prazo_max_dias === null || linha.prazo_max_dias === undefined ? null : Number(linha.prazo_max_dias),
      linhaCores: texto(linha.linha_cores), cor: texto(linha.cor),
      categoriasExtras: (await database.prepare('SELECT categoria_id FROM loja_produto_categorias WHERE produto_id = ?').all(id)).map((item) => texto(item.categoria_id)),
      complementos: await referencias('complemento'), semelhantes: await referencias('semelhante'),
      grupos: grupos.map((grupo) => ({ grupoId: texto(grupo.id), nome: texto(grupo.nome), tipo: texto(grupo.tipo) as 'escolha' | 'personalizacao', ordem: Number(grupo.ordem) })),
      imagens: await imagensDoProduto(id), seoTitulo: texto(linha.seo_titulo), seoDescricao: texto(linha.seo_descricao), criadoEm: iso(linha.criado),
      urlLoja: `${origemLoja}/produto/${texto(linha.slug)}`,
    },
  };
}

async function inserir(id: string, dados: Dados, agora: number) {
  const database = gestaoDb();
  const ordem = dados.ordem ?? Number((await database.prepare('SELECT COALESCE(MAX(ordem), -10) + 10 AS proxima FROM loja_produtos').get())?.proxima ?? 0);
  await database.prepare(`INSERT INTO loja_produtos (id, slug, sku, nome, marca, resumo, descricao_json, preco_centavos, preco_de_centavos, unidade, selo, pecas_json, personalizacao, ficha_json, atributos_json, disponibilidade, prazo_min_dias, prazo_max_dias, status, destaque, categoria_id, linha_cores, cor, ordem, seo_titulo, seo_descricao, revisao, criado, atualizado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
    id, dados.slug, dados.sku, dados.nome, dados.marca, dados.resumo, JSON.stringify(dados.descricao), dados.preco, dados.precoDe, dados.unidade, dados.selo, JSON.stringify(dados.pecas), dados.personalizacao,
    JSON.stringify(dados.ficha), JSON.stringify(dados.atributos), dados.disponibilidade, dados.prazoMin, dados.prazoMax, dados.status, dados.destaque ? 1 : 0, dados.categoriaId, dados.linhaCores, dados.cor,
    Math.min(ordem, 1_000_000), dados.seoTitulo, dados.seoDescricao, agora, agora,
  );
}

export async function criarProduto(entradaBruta: unknown, ator: Actor, origemLoja = '') {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta);
  for (const campo of ['slug', 'sku', 'nome', 'precoCentavos', 'categoriaId']) if (entrada[campo] === undefined) throw new ApiError(400, `Campo obrigatório: ${campo}.`, 'INVALID_INPUT');
  const dados = validar(entrada), id = novoId(), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    await conferirReferencias(id, dados);
    await inserir(id, dados, Date.now());
    await gravarRelacoes(id, dados);
    await auditarGestao(ator.id, 'created', 'loja_produtos', id);
  });
  return obterProduto(id, origemLoja);
}

export async function atualizarProduto(id: string, entradaBruta: unknown, ator: Actor, origemLoja = '') {
  exigirGravacaoGestao();
  const entrada = objeto(entradaBruta), { revisao, ...campos } = entrada, esperada = revisaoCampo(revisao), database = gestaoDb();
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaProduto(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    const dados = validar(campos, atual);
    await conferirReferencias(id, dados);
    await database.prepare(`UPDATE loja_produtos SET slug = ?, sku = ?, nome = ?, marca = ?, resumo = ?, descricao_json = ?, preco_centavos = ?, preco_de_centavos = ?, unidade = ?, selo = ?, pecas_json = ?, personalizacao = ?, ficha_json = ?, atributos_json = ?, disponibilidade = ?, prazo_min_dias = ?, prazo_max_dias = ?, status = ?, destaque = ?, categoria_id = ?, linha_cores = ?, cor = ?, ordem = ?, seo_titulo = ?, seo_descricao = ?, revisao = revisao + 1, atualizado = ? WHERE id = ? AND revisao = ?`).run(
      dados.slug, dados.sku, dados.nome, dados.marca, dados.resumo, JSON.stringify(dados.descricao), dados.preco, dados.precoDe, dados.unidade, dados.selo, JSON.stringify(dados.pecas), dados.personalizacao,
      JSON.stringify(dados.ficha), JSON.stringify(dados.atributos), dados.disponibilidade, dados.prazoMin, dados.prazoMax, dados.status, dados.destaque ? 1 : 0, dados.categoriaId, dados.linhaCores, dados.cor,
      dados.ordem ?? Number(atual.ordem), dados.seoTitulo, dados.seoDescricao, Date.now(), id, esperada,
    );
    await gravarRelacoes(id, dados);
    await auditarGestao(ator.id, dados.status === 'arquivado' && texto(atual.status) !== 'arquivado' ? 'archived' : 'updated', 'loja_produtos', id);
  });
  return obterProduto(id, origemLoja);
}

export async function arquivarProduto(id: string, revisaoBruta: unknown, ator: Actor, origemLoja = '') {
  return atualizarProduto(id, { revisao: revisaoBruta, status: 'arquivado' }, ator, origemLoja);
}

/** Cópia em RASCUNHO: mesmos dados, relações, opções e fotos; slug e SKU novos (padrão: "-copia"). */
export async function duplicarProduto(id: string, entradaBruta: unknown, ator: Actor, origemLoja = '') {
  exigirGravacaoGestao();
  const entrada = (entradaBruta === undefined || entradaBruta === null ? {} : objeto(entradaBruta)) as EntradaDuplicar & Record<string, unknown>;
  permitidos(entrada, ['slug', 'sku', 'nome']);
  const novo = novoId(), database = variantsDb(gestaoDb());
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaProduto(id);
    const livre = async (coluna: 'slug' | 'sku', base: string) => {
      for (let n = 1; n < 50; n++) {
        const candidato = coluna === 'slug' ? `${base}-copia${n > 1 ? `-${n}` : ''}`.slice(0, 120) : `${base}-C${n}`.slice(0, 40);
        if (!await database.prepare(`SELECT id FROM loja_produtos WHERE ${coluna} = ?`).get(candidato)) return candidato;
      }
      throw new ApiError(409, 'Informe outro slug/SKU para a cópia.', 'DUPLICATE_SLUG');
    };
    const dados = validar({
      slug: entrada.slug ?? await livre('slug', texto(atual.slug)),
      sku: entrada.sku ?? await livre('sku', texto(atual.sku)),
      nome: entrada.nome ?? `${texto(atual.nome)} (cópia)`.slice(0, 160),
      status: 'rascunho',
    }, atual);
    await conferirReferencias(novo, dados);
    await inserir(novo, { ...dados, ordem: Number(atual.ordem) + 1 }, Date.now());
    await database.prepare('INSERT INTO loja_produto_categorias (produto_id, categoria_id) SELECT CAST(? AS TEXT), categoria_id FROM loja_produto_categorias WHERE produto_id = ?').run(novo, id);
    await database.prepare('INSERT INTO loja_produto_relacionados (produto_id, relacionado_id, tipo, ordem) SELECT CAST(? AS TEXT), relacionado_id, tipo, ordem FROM loja_produto_relacionados WHERE produto_id = ? AND relacionado_id <> ?').run(novo, id, novo);
    await database.prepare('INSERT INTO loja_produto_grupos (produto_id, grupo_id, ordem) SELECT CAST(? AS TEXT), grupo_id, ordem FROM loja_produto_grupos WHERE produto_id = ?').run(novo, id);
    for (const imagem of await database.prepare('SELECT id FROM loja_produto_imagens WHERE produto_id = ? ORDER BY posicao').all(id)) {
      const imagemId=novoId();
      await database.prepare('INSERT INTO loja_produto_imagens (id, produto_id, posicao, alt, cor, tipo, largura, altura, mime, tamanho, hash, grande, mini, criada, grande_key, mini_key) SELECT CAST(? AS TEXT), CAST(? AS TEXT), posicao, alt, cor, tipo, largura, altura, mime, tamanho, hash, grande, mini, CAST(? AS BIGINT), grande_key, mini_key FROM loja_produto_imagens WHERE id = ?').run(imagemId, novo, Date.now(), texto(imagem.id));
      await database.prepare(`INSERT INTO ${variantsTable(database)} (kind,owner_id,variant,format,object_key,content,size,width,height,original_size,profile,created,public_url) SELECT kind,CAST(? AS TEXT),variant,format,object_key,content,size,width,height,original_size,profile,created,public_url FROM ${variantsTable(database)} WHERE kind='product' AND owner_id=?`).run(imagemId,texto(imagem.id));
    }
    await auditarGestao(ator.id, 'created', 'loja_produtos', novo);
  });
  return obterProduto(novo, origemLoja);
}

/** Remoção definitiva: só rascunho ou arquivado (o ativo, arquive antes). Pedidos antigos guardam o retrato. */
export async function removerProduto(id: string, revisaoBruta: unknown, ator: Actor) {
  exigirGravacaoGestao();
  const esperada = revisaoCampo(revisaoBruta), database = gestaoDb();
  const keys:string[]=[];
  await database.transaction(async () => {
    await travarGestao();
    const atual = await linhaProduto(id);
    if (Number(atual.revisao) !== esperada) throw conflito();
    if (texto(atual.status) === 'ativo') throw new ApiError(409, 'Arquive o produto antes de remover.', 'PRODUCT_ACTIVE');
    for(const image of await database.prepare('SELECT id,grande_key,mini_key FROM loja_produto_imagens WHERE produto_id=?').all(id)) {
      keys.push(...[image.grande_key,image.mini_key].filter(Boolean).map(String));
      keys.push(...await deleteImageVariants(database,'product',String(image.id)));
    }
    await database.prepare('DELETE FROM loja_produtos WHERE id = ?').run(id);
    await auditarGestao(ator.id, 'removed', 'loja_produtos', id);
  });
  await liberarObjetosDasImagens(keys);
  return { removido: true };
}
