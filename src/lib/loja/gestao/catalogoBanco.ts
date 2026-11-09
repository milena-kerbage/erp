import { randomBytes } from 'node:crypto';
import type { ItemMenu, LinkMenu, PainelMenu } from '../../../loja/componentes/layout/cabecalho/menu.ts';
import type { NomeIcone, TomMidia } from '../../../loja/componentes/inicio/Midia.tsx';
import { CUPONS } from '../../../loja/lib/carrinho/totais.ts';
import { PRONTA_ENTREGA, SOB_ENCOMENDA, MARCA_PADRAO } from '../../../loja/lib/catalogo/constantes.ts';
import type { Irmao, Produto } from '../../../loja/lib/catalogo/exemplos.ts';
import { fotoPrincipal, type ImagemProduto, imagensDe, type TipoImagem } from '../../../loja/lib/catalogo/fotos.ts';
import { type CatalogoLoja, type CategoriaCatalogo, type ColecaoCatalogo, semelhantesAutomaticos } from '../../../loja/lib/catalogo/fonte.ts';
import { cuponsDeCampanha } from './cupons.ts';
import { booleano, gestaoDb, json, type Linha, texto } from './esquema.ts';

// Catálogo da loja lido do cadastro do ERP (migração 010) e convertido para as MESMAS estruturas do
// catálogo de exemplo (Produto, ItemMenu, Cupom…), para a loja não mudar de cara. Devolve null quando o
// banco não tem nenhum produto ATIVO: a loja então usa o catálogo estático (fallback).
// Só leitura; nenhuma escrita acontece aqui.

const decimal = (centavos: number) => `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
const caminhoUrl = (chave: string) => `/${chave}`;

/** URL pública da foto do produto (rota da loja com cache longo; `v` muda quando a foto muda). */
export const urlImagemProduto = (id: string, hash: string, tamanho: 'grande' | 'mini' = 'grande') => `/api/catalogo/imagem/${id}?v=${hash.slice(0, 12)}${tamanho === 'mini' ? '&tamanho=mini' : ''}`;

type CategoriaLinha = { id: string; paiId: string | null; caminho: string; nome: string; ordem: number; ativa: boolean; descricao: string; imagem: string; seoTitulo: string; seoDescricao: string };

function categoriasEmOrdem(linhas: Linha[]): CategoriaLinha[] {
  const todas = linhas.map((linha) => ({
    id: texto(linha.id), paiId: linha.pai_id ? texto(linha.pai_id) : null, caminho: texto(linha.caminho), nome: texto(linha.nome), ordem: Number(linha.ordem), ativa: booleano(linha.ativa),
    descricao: texto(linha.descricao), imagem: texto(linha.imagem), seoTitulo: texto(linha.seo_titulo), seoDescricao: texto(linha.seo_descricao),
  }));
  const filhos = new Map<string | null, CategoriaLinha[]>();
  for (const categoria of todas) filhos.set(categoria.paiId, [...(filhos.get(categoria.paiId) ?? []), categoria]);
  for (const lista of filhos.values()) lista.sort((a, b) => a.ordem - b.ordem || a.caminho.localeCompare(b.caminho));
  const saida: CategoriaLinha[] = [];
  const visitar = (pai: string | null) => { for (const categoria of filhos.get(pai) ?? []) { saida.push(categoria); visitar(categoria.id); } };
  visitar(null);
  return saida;
}

function menuDe(linhas: Linha[]): ItemMenu[] {
  const filhos = new Map<string, Linha[]>();
  for (const linha of linhas) if (linha.pai_id) filhos.set(texto(linha.pai_id), [...(filhos.get(texto(linha.pai_id)) ?? []), linha]);
  const ordenar = (lista: Linha[]) => [...lista].sort((a, b) => Number(a.ordem) - Number(b.ordem) || texto(a.id).localeCompare(texto(b.id)));
  const link = (linha: Linha): LinkMenu => ({ rotulo: texto(linha.rotulo), href: texto(linha.href), ...(booleano(linha.externo) ? { externo: true } : {}) });
  const midia = (linha: Linha) => ({ tom: (texto(linha.tom) || 'linho') as TomMidia, icone: (texto(linha.icone) || 'bebe') as NomeIcone, ...(texto(linha.imagem) ? { src: texto(linha.imagem) } : {}) });
  return ordenar(linhas.filter((linha) => texto(linha.secao) === 'item')).map((item) => {
    const dentro = ordenar(filhos.get(texto(item.id)) ?? []);
    const de = (secao: string) => dentro.filter((linha) => texto(linha.secao) === secao);
    const cards = de('card').map((linha) => ({ rotulo: texto(linha.rotulo), href: texto(linha.href), ...midia(linha) }));
    const promo = de('promo')[0];
    const painel: PainelMenu = texto(item.painel) === 'cards'
      ? { tipo: 'cards', cards }
      : {
        tipo: 'colunas',
        destaques: de('destaque').map(link),
        secundarios: de('secundario').map(link),
        colunas: de('coluna').map((coluna) => ({ titulo: texto(coluna.rotulo), href: texto(coluna.href), links: ordenar(filhos.get(texto(coluna.id)) ?? []).filter((linha) => texto(linha.secao) === 'link').map(link) })),
        cards,
        promo: promo ? { titulo: texto(promo.rotulo), descricao: texto(promo.descricao), href: texto(promo.href), ...midia(promo) } : undefined,
      };
    return { id: texto(item.id), rotulo: texto(item.rotulo), href: texto(item.href), ...(booleano(item.destaque) ? { destaque: true } : {}), ...(booleano(item.so_botao) ? { soBotao: true } : {}), painel };
  });
}

/** Uma transação só (um cliente do pool, leitura consistente entre as tabelas). */
export async function lerCatalogoDoBanco(): Promise<CatalogoLoja | null> {
  return gestaoDb().transaction(lerCatalogo);
}

async function lerCatalogo(): Promise<CatalogoLoja | null> {
  const database = gestaoDb();
  const produtosLinhas = await database.prepare("SELECT * FROM loja_produtos WHERE status = 'ativo' ORDER BY ordem, criado, slug").all();
  if (!produtosLinhas.length) return null;
  const [categoriasLinhas, extrasLinhas, relacionadosLinhas, imagensLinhas, gruposLinhas, opcoesLinhas, colecoesLinhas, colecaoProdutosLinhas, menuLinhas, cupons] = [
    await database.prepare('SELECT * FROM loja_categorias').all(),
    await database.prepare('SELECT produto_id, categoria_id FROM loja_produto_categorias').all(),
    await database.prepare('SELECT produto_id, relacionado_id, tipo, ordem FROM loja_produto_relacionados ORDER BY ordem').all(),
    await database.prepare('SELECT id, produto_id, posicao, alt, cor, tipo, hash FROM loja_produto_imagens ORDER BY posicao').all(),
    await database.prepare('SELECT g.*, pg.produto_id, pg.ordem AS ordem_produto FROM loja_produto_grupos pg JOIN loja_grupos_opcoes g ON g.id = pg.grupo_id ORDER BY pg.ordem, g.nome').all(),
    await database.prepare('SELECT * FROM loja_opcoes ORDER BY ordem, rotulo').all(),
    await database.prepare('SELECT * FROM loja_colecoes WHERE ativa = 1 ORDER BY ordem, nome').all(),
    await database.prepare('SELECT colecao_id, produto_id, ordem FROM loja_colecao_produtos ORDER BY ordem').all(),
    await database.prepare('SELECT * FROM loja_menu_itens WHERE ativo = 1').all(),
    await cuponsDeCampanha(),
  ];

  // Categorias: só as ativas entram na árvore da loja; o caminho do produto usa a categoria mesmo inativa.
  const ordenadas = categoriasEmOrdem(categoriasLinhas);
  const porId = new Map(ordenadas.map((categoria) => [categoria.id, categoria]));
  const ativa = (categoria: CategoriaLinha | undefined): boolean => Boolean(categoria?.ativa && (!categoria.paiId || ativa(porId.get(categoria.paiId))));
  const categorias: CategoriaCatalogo[] = ordenadas.filter((categoria) => ativa(categoria)).map((categoria) => ({
    chave: categoria.caminho, rotulo: categoria.nome,
    ...(categoria.descricao ? { descricao: categoria.descricao } : {}), ...(categoria.imagem ? { imagem: categoria.imagem } : {}),
    ...(categoria.seoTitulo ? { seoTitulo: categoria.seoTitulo } : {}), ...(categoria.seoDescricao ? { seoDescricao: categoria.seoDescricao } : {}),
  }));
  const trilhaDe = (id: string) => {
    const trilha: Produto['trilha'] = [];
    for (let atual = porId.get(id); atual; atual = atual.paiId ? porId.get(atual.paiId) : undefined) trilha.unshift({ rotulo: atual.nome, href: caminhoUrl(atual.caminho) });
    return trilha;
  };

  const ativos = new Map(produtosLinhas.map((linha) => [texto(linha.id), linha]));
  const slugDe = (id: string) => texto(ativos.get(id)?.slug);
  const agrupar = <T>(linhas: Linha[], chave: string, valor: (linha: Linha) => T) => {
    const mapa = new Map<string, T[]>();
    for (const linha of linhas) mapa.set(texto(linha[chave]), [...(mapa.get(texto(linha[chave])) ?? []), valor(linha)]);
    return mapa;
  };
  const extras = agrupar(extrasLinhas, 'produto_id', (linha) => porId.get(texto(linha.categoria_id)));
  const relacionados = agrupar(relacionadosLinhas.filter((linha) => ativos.has(texto(linha.relacionado_id))), 'produto_id', (linha) => ({ tipo: texto(linha.tipo), slug: slugDe(texto(linha.relacionado_id)) }));
  const imagens = agrupar(imagensLinhas, 'produto_id', (linha): ImagemProduto => ({ src: urlImagemProduto(texto(linha.id), texto(linha.hash)), alt: texto(linha.alt), tipo: texto(linha.tipo) as TipoImagem }));
  const opcoes = agrupar(opcoesLinhas, 'grupo_id', (linha) => ({ rotulo: texto(linha.rotulo), disponivel: booleano(linha.disponivel), acrescimo: Number(linha.acrescimo_centavos) }));
  const grupos = agrupar(gruposLinhas, 'produto_id', (linha) => ({ id: texto(linha.id), nome: texto(linha.nome), tipo: texto(linha.tipo) }));

  const produtos: Produto[] = produtosLinhas.map((linha) => {
    const id = texto(linha.id), slug = texto(linha.slug);
    const categoria = porId.get(texto(linha.categoria_id));
    const pronta = texto(linha.disponibilidade) === 'pronta_entrega';
    const atributos: Record<string, string[]> = { ...json<Record<string, string[]>>(linha.atributos_json, {}) };
    delete atributos.retirada;
    atributos.entrega = [pronta ? PRONTA_ENTREGA : SOB_ENCOMENDA];
    // Pronta entrega dá para retirar no ateliê, em Fortaleza (a mesma regra do catálogo de exemplo).
    if (pronta) atributos.retirada = ['Sim'];
    const ligados = grupos.get(id) ?? [];
    const escolha = ligados.find((grupo) => grupo.tipo === 'escolha');
    const bordado = ligados.find((grupo) => grupo.tipo === 'personalizacao');
    const acrescimoBordado = bordado ? (opcoes.get(bordado.id)?.[0]?.acrescimo ?? 0) : 0;
    const pecas = json<string[]>(linha.pecas_json, []);
    const fotos = imagens.get(id) ?? imagensDe(slug);
    const precoDe = linha.preco_de_centavos === null || linha.preco_de_centavos === undefined ? undefined : decimal(Number(linha.preco_de_centavos));
    const extrasDoProduto = (extras.get(id) ?? []).filter((extra): extra is CategoriaLinha => Boolean(extra && ativa(extra))).map((extra) => caminhoUrl(extra.caminho));
    const ligacoes = relacionados.get(id) ?? [];
    return {
      slug,
      sku: texto(linha.sku),
      nome: texto(linha.nome),
      marca: texto(linha.marca) || MARCA_PADRAO,
      trilha: categoria ? trilhaDe(categoria.id) : [],
      caminho: categoria ? caminhoUrl(categoria.caminho) : '/',
      atributos,
      resumo: texto(linha.resumo),
      ...(fotos?.length ? { imagens: fotos } : {}),
      ...(texto(linha.selo) ? { selo: texto(linha.selo) } : {}),
      preco: decimal(Number(linha.preco_centavos)),
      unidade: texto(linha.unidade),
      ...(pecas.length ? { pecas } : {}),
      ...(texto(linha.personalizacao) ? { personalizacao: texto(linha.personalizacao) } : {}),
      ...(escolha ? { variacao: { titulo: escolha.nome, opcoes: (opcoes.get(escolha.id) ?? []).map(({ rotulo, disponivel, acrescimo }) => ({ rotulo, disponivel, ...(acrescimo > 0 ? { acrescimoCentavos: acrescimo } : {}) })) } } : {}),
      descricao: json<string[]>(linha.descricao_json, []),
      ficha: json<Produto['ficha']>(linha.ficha_json, []),
      documentos: [],
      avaliacoes: null,
      complementos: ligacoes.filter((ligacao) => ligacao.tipo === 'complemento').map((ligacao) => ligacao.slug),
      semelhantes: ligacoes.filter((ligacao) => ligacao.tipo === 'semelhante').map((ligacao) => ligacao.slug),
      ...(precoDe ? { precoDe } : {}),
      ...(extrasDoProduto.length ? { caminhosExtras: extrasDoProduto } : {}),
      ...(acrescimoBordado > 0 && texto(linha.personalizacao) ? { personalizacaoAcrescimoCentavos: acrescimoBordado } : {}),
      ...(linha.prazo_min_dias !== null && linha.prazo_max_dias !== null && linha.prazo_min_dias !== undefined ? { prazo: { min: Number(linha.prazo_min_dias), max: Number(linha.prazo_max_dias) } } : {}),
      ...(booleano(linha.destaque) ? { destaque: true } : {}),
      ...(texto(linha.seo_titulo) || texto(linha.seo_descricao) ? { seo: { ...(texto(linha.seo_titulo) ? { titulo: texto(linha.seo_titulo) } : {}), ...(texto(linha.seo_descricao) ? { descricao: texto(linha.seo_descricao) } : {}) } } : {}),
    };
  });

  // "Você também poderá gostar": o cadastrado ou, sem nada cadastrado, o automático (mesma regra do exemplo).
  for (const produto of produtos) if (!produto.semelhantes.length) produto.semelhantes = semelhantesAutomaticos(produto, produtos);

  // A mesma peça em outras cores (produtos ativos com a mesma linha de cores).
  const porSlug = new Map(produtos.map((produto) => [produto.slug, produto]));
  const linhas = agrupar(produtosLinhas.filter((linha) => texto(linha.linha_cores) && texto(linha.cor)), 'linha_cores', (linha) => ({ slug: texto(linha.slug), cor: texto(linha.cor) }));
  for (const irmaos of linhas.values()) {
    if (irmaos.length < 2) continue;
    for (const { slug } of irmaos) {
      const produto = porSlug.get(slug);
      if (!produto) continue;
      produto.irmaos = {
        titulo: 'Cor',
        atual: slug,
        itens: irmaos.map(({ slug: outroSlug, cor }): Irmao => {
          const outro = porSlug.get(outroSlug);
          return { rotulo: cor, slug: outroSlug, foto: outro ? fotoPrincipal(outro) : undefined, nome: outro?.nome, preco: outro?.preco, selo: outro?.selo, caminho: outro?.caminho, imagens: outro?.imagens };
        }),
      };
    }
  }

  const produtosDaColecao = agrupar(colecaoProdutosLinhas.filter((linha) => ativos.has(texto(linha.produto_id))), 'colecao_id', (linha) => slugDe(texto(linha.produto_id)));
  const colecoes: ColecaoCatalogo[] = colecoesLinhas.map((linha) => ({
    slug: texto(linha.slug), nome: texto(linha.nome), ...(texto(linha.descricao) ? { descricao: texto(linha.descricao) } : {}),
    onde: texto(linha.onde) as ColecaoCatalogo['onde'], produtos: produtosDaColecao.get(texto(linha.id)) ?? [],
  }));
  const maisVendidos = colecoes.find((colecao) => colecao.slug === 'mais-vendidos')?.produtos
    ?? [...produtos.filter((produto) => produto.destaque), ...produtos.filter((produto) => !produto.destaque)].slice(0, 8).map((produto) => produto.slug);

  return {
    origem: 'banco',
    versao: `banco:${Date.now().toString(36)}:${randomBytes(4).toString('hex')}`,
    produtos,
    categorias,
    colecoes,
    maisVendidos,
    cupons: cupons ?? CUPONS,
    menu: menuLinhas.length ? menuDe(menuLinhas) : null,
  };
}
