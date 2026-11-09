// Catálogo da loja como UM retrato serializável: produtos (na estrutura Produto de sempre), categorias,
// coleções, mais vendidos, cupons de campanha (prévia da sacola) e o menu do cabeçalho. Duas origens:
// - "banco": o cadastro do ERP (src/lib/loja/gestao/catalogoBanco.ts), lido com cache por tag
//   (src/lib/loja/catalogo.ts);
// - "estatico": o catálogo de exemplo em código (exemplos.ts, categorias.ts, menu.ts), que é também o
//   FALLBACK quando o banco está vazio ou indisponível (a loja nunca quebra).
// Os índices (por slug, árvore de categorias) são memorizados pela `versao` do retrato.

import type { ItemMenu } from "@/loja/componentes/layout/cabecalho/menu";
import { CUPONS, type Cupom } from "@/loja/lib/carrinho/totais";
import { ARVORE_ESTATICA, type ArvoreCategorias, type CategoriaBase, criarArvoreCategorias, type Elo } from "./categorias";
import { PRONTA_ENTREGA } from "./constantes";
import { listarProdutos, MAIS_VENDIDOS_SLUGS, type Produto } from "./exemplos";

export type CategoriaCatalogo = CategoriaBase & { descricao?: string; imagem?: string; seoTitulo?: string; seoDescricao?: string };
export type ColecaoCatalogo = { slug: string; nome: string; descricao?: string; onde: "home" | "listagem" | "ambos"; produtos: string[] };

export type CatalogoLoja = {
  origem: "banco" | "estatico";
  versao: string;
  produtos: Produto[]; // só os ativos, na ordem de exibição
  categorias: CategoriaCatalogo[]; // ativas, mães antes das filhas
  colecoes: ColecaoCatalogo[];
  maisVendidos: string[];
  cupons: Cupom[]; // cupons de campanha ativos (a sacola mostra a prévia; o servidor confere no pedido)
  menu: ItemMenu[] | null; // null: menu estático (montarMenu)
};

export function catalogoEstatico(): CatalogoLoja {
  const produtos = listarProdutos();
  return {
    origem: "estatico",
    versao: "estatico",
    produtos,
    categorias: ARVORE_ESTATICA.lista,
    colecoes: [
      { slug: "mais-vendidos", nome: "Mais vendidos", onde: "ambos", produtos: MAIS_VENDIDOS_SLUGS },
      { slug: "pronta-entrega", nome: "Pronta entrega", onde: "home", produtos: produtos.filter((produto) => produto.atributos.entrega?.includes(PRONTA_ENTREGA)).map((produto) => produto.slug) },
    ],
    maisVendidos: MAIS_VENDIDOS_SLUGS,
    cupons: CUPONS,
    menu: null,
  };
}

// ---------------------------------------------------------------- Índices

export type IndiceCatalogo = {
  porSlug: Map<string, Produto>;
  buscarProduto(slug: string): Produto | null;
  buscarVarios(slugs: string[]): Produto[];
  listarSlugs(): string[];
  colecao(slug: string): Produto[];
};

const indices = new Map<string, IndiceCatalogo>();
const arvores = new Map<string, ArvoreCategorias>();
const LIMITE_MEMORIA = 8;
function guardar<T>(mapa: Map<string, T>, chave: string, valor: T) {
  if (mapa.size >= LIMITE_MEMORIA) mapa.delete(mapa.keys().next().value as string);
  mapa.set(chave, valor);
  return valor;
}

export function indiceDoCatalogo(catalogo: CatalogoLoja): IndiceCatalogo {
  const pronto = indices.get(catalogo.versao);
  if (pronto) return pronto;
  const porSlug = new Map(catalogo.produtos.map((produto) => [produto.slug, produto]));
  const buscarVarios = (slugs: string[]) => slugs.map((slug) => porSlug.get(slug)).filter((produto): produto is Produto => Boolean(produto));
  return guardar(indices, catalogo.versao, {
    porSlug,
    buscarProduto: (slug) => porSlug.get(slug) ?? null,
    buscarVarios,
    listarSlugs: () => catalogo.produtos.map((produto) => produto.slug),
    colecao: (slug) => buscarVarios(catalogo.colecoes.find((colecao) => colecao.slug === slug)?.produtos ?? []),
  });
}

/** Links do menu que podem ser facetas indexáveis (colunas e links primeiro, depois os cards). */
export function linksDoMenu(menu: ItemMenu[]): Elo[] {
  const links: Elo[] = [];
  for (const item of menu) {
    links.push({ rotulo: item.rotulo, href: item.href });
    if (item.painel.tipo === "colunas") for (const coluna of item.painel.colunas) links.push({ rotulo: coluna.titulo, href: coluna.href }, ...coluna.links);
  }
  for (const item of menu) for (const card of item.painel.cards) links.push({ rotulo: card.rotulo, href: card.href });
  return links;
}

/** Árvore de categorias do retrato: a estática quando o catálogo é o de exemplo. */
export function arvoreDoCatalogo(catalogo: CatalogoLoja, menuEstatico: () => ItemMenu[]): ArvoreCategorias {
  if (catalogo.origem === "estatico") return ARVORE_ESTATICA;
  const pronta = arvores.get(catalogo.versao);
  if (pronta) return pronta;
  const menu = catalogo.menu ?? menuEstatico();
  const chaves = new Set(catalogo.categorias.map((categoria) => categoria.chave));
  // Principais: os itens do 1º nível do menu que são categorias (o botão sem página própria não conta).
  const principais = menu
    .filter((item) => !item.soBotao)
    .map((item) => item.href.split("?")[0].split("/").filter(Boolean).join("/"))
    .filter((chave) => chaves.has(chave));
  return guardar(arvores, catalogo.versao, criarArvoreCategorias(catalogo.categorias, linksDoMenu(menu), [...new Set(principais)]));
}

/**
 * "Você também poderá gostar" automático (quando o cadastro não define): mesma categoria primeiro, depois
 * o resto do catálogo, sem repetir os complementos, até 8. A mesma regra do catálogo de exemplo.
 */
export function semelhantesAutomaticos(produto: Pick<Produto, "slug" | "caminho" | "complementos">, todos: Pick<Produto, "slug" | "caminho">[]): string[] {
  return [...todos.filter((outro) => outro.slug !== produto.slug && outro.caminho === produto.caminho), ...todos.filter((outro) => outro.slug !== produto.slug && outro.caminho !== produto.caminho)]
    .map((outro) => outro.slug)
    .filter((slug) => !produto.complementos.includes(slug))
    .slice(0, 8);
}
