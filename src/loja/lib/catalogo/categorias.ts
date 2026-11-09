// Árvore de categorias da loja. Duas fontes, a mesma montagem (criarArvoreCategorias):
// - ESTÁTICA (este arquivo): a partir do menu do cabeçalho (navegacao.ts), a lista oficial enquanto o
//   catálogo não vem do banco; é a que o proxy usa (síncrono) e o fallback da loja;
// - BANCO (src/lib/loja/catalogo.ts): as categorias cadastradas no ERP (erp_core.loja_categorias), com
//   as facetas tiradas dos links do menu.
// Chaves sem barra inicial, no formato do motor de URLs ("kit-berco/kits").

import { NAVEGACAO } from "@/loja/componentes/layout/cabecalho/navegacao";
import { REGRAS_SEO } from "@/loja/lib/seo/config";

export type Elo = { rotulo: string; href: string };
export type Categoria = { chave: string; rotulo: string; trilha: Elo[]; filhos: Elo[]; facetas: Elo[] };
export type CategoriaBase = { chave: string; rotulo: string };

export type ArvoreCategorias = {
  existentes: Set<string>;
  lista: CategoriaBase[];
  buscarCategoria(chave: string): Categoria | null;
  rotuloFaceta(chave: string, caminhoCompleto: string): string | null;
  irmas(chave: string): Elo[];
  caminhosParaPreGerar(): string[][];
  categoriasRelacionadas(chaves: string[], quantidade?: number): Elo[];
};

function chaveDe(href: string): string | null {
  if (!href.startsWith("/") || href.includes("?")) return null;
  return href.split("/").filter(Boolean).join("/");
}

// Link cujo último segmento é faceta indexável da categoria-mãe (ex.: kit-berco/kits/menina)
// não é categoria: é a página de faceta, montada pelo motor de URLs.
function ehFaceta(chave: string): { mae: string } | null {
  const partes = chave.split("/");
  const mae = partes.slice(0, -1).join("/");
  const regra = REGRAS_SEO.categorias[mae];
  return regra?.facetasIndexaveis.some((faceta) => faceta.valores.includes(partes.at(-1) ?? "")) ? { mae } : null;
}

// Afinidade entre linhas (quem compra uma costuma levar a outra): base das sugestões de
// "Continue explorando" no fim da listagem. PROVISÓRIO até haver dados de compra conjunta.
const AFINS: Record<string, string[]> = {
  "kit-berco": ["enxoval/mantas", "quarto/cortinas", "quarto/tapetes", "kit-berco/lencois", "enxoval/paninhos", "quarto/mosquiteiros"],
  enxoval: ["maternidade/saidas", "maternidade/bolsas", "kit-berco/kits", "enxoval/kits", "quarto/trocador"],
  quarto: ["kit-berco/kits", "quarto/almofadas", "enxoval/mantas", "kit-berco/protetores", "maternidade/enfeites-de-porta"],
  maternidade: ["enxoval/paninhos", "enxoval/mantas", "maternidade/kits", "enxoval/kits", "kit-berco/kits"],
};

/**
 * Monta a árvore a partir da lista de categorias (na ordem de exibição) e dos links que podem ser facetas
 * indexáveis (os do menu). `principais`: as categorias do 1º nível do menu, na ordem do menu.
 */
export function criarArvoreCategorias(categorias: CategoriaBase[], linksFaceta: Elo[], principais?: string[]): ArvoreCategorias {
  const rotulos = new Map<string, string>();
  for (const { chave, rotulo } of categorias) if (chave && !rotulos.has(chave)) rotulos.set(chave, rotulo);
  const facetasPorCategoria = new Map<string, Elo[]>();
  for (const link of linksFaceta) {
    const chave = chaveDe(link.href);
    if (!chave) continue;
    const faceta = ehFaceta(chave);
    if (!faceta) continue;
    const lista = facetasPorCategoria.get(faceta.mae) ?? [];
    if (!lista.some((elo) => elo.href === link.href)) lista.push({ rotulo: link.rotulo, href: link.href });
    facetasPorCategoria.set(faceta.mae, lista);
  }

  // Mãe = a categoria existente mais longa que é prefixo do caminho.
  function maeDe(chave: string): string | null {
    const partes = chave.split("/");
    for (let i = partes.length - 1; i > 0; i--) {
      const candidata = partes.slice(0, i).join("/");
      if (rotulos.has(candidata)) return candidata;
    }
    return null;
  }

  const mapa = new Map<string, Categoria>();
  for (const [chave, rotulo] of rotulos) {
    const trilha: Elo[] = [];
    for (let mae = maeDe(chave); mae; mae = maeDe(mae)) trilha.unshift({ rotulo: rotulos.get(mae) ?? mae, href: `/${mae}` });
    const filhos = [...rotulos.keys()].filter((outra) => maeDe(outra) === chave).map((outra) => ({ rotulo: rotulos.get(outra) ?? outra, href: `/${outra}` }));
    mapa.set(chave, { chave, rotulo, trilha, filhos, facetas: facetasPorCategoria.get(chave) ?? [] });
  }
  const existentes = new Set(mapa.keys());
  const raizes = principais ?? [...rotulos.keys()].filter((chave) => !maeDe(chave) && chave !== "personalizado");

  function irmas(chave: string): Elo[] {
    const mae = maeDe(chave);
    if (!mae) return [];
    return (mapa.get(mae)?.filhos ?? []).filter((elo) => elo.href !== `/${chave}`);
  }

  return {
    existentes,
    lista: [...rotulos].map(([chave, rotulo]) => ({ chave, rotulo })),
    buscarCategoria: (chave) => mapa.get(chave) ?? null,
    // Rótulo do link de faceta no menu ("Para menina"), para o título da página.
    rotuloFaceta: (chave, caminhoCompleto) => facetasPorCategoria.get(chave)?.find((elo) => elo.href === caminhoCompleto)?.rotulo ?? null,
    // Irmãs: para a página de uma folha (sem filhos) mostrar caminhos ao lado, como as fotos da Lululemon.
    irmas,
    // Todos os caminhos que viram página estática no build (categorias + facetas do menu).
    caminhosParaPreGerar() {
      const facetas = [...facetasPorCategoria.values()].flat().map((elo) => chaveDe(elo.href) ?? "");
      return [...existentes, ...facetas].filter(Boolean).map((chave) => chave.split("/"));
    },
    // Sugestões para o fim da listagem: irmãs da categoria, linhas afins e as categorias principais,
    // sem repetir, sem a própria categoria nem as filhas (que já aparecem no topo da página).
    categoriasRelacionadas(chaves, quantidade = 12) {
      const atuais = new Set(chaves);
      const filhas = new Set(chaves.flatMap((chave) => (mapa.get(chave)?.filhos ?? []).map((elo) => elo.href.slice(1))));
      const candidatas = [...chaves.flatMap((chave) => irmas(chave).map((elo) => elo.href.slice(1))), ...chaves.flatMap((chave) => AFINS[chave.split("/")[0]] ?? []), ...raizes];
      const vistas = new Set<string>();
      const saida: Elo[] = [];
      for (const chave of candidatas) {
        if (vistas.has(chave) || atuais.has(chave) || filhas.has(chave) || !mapa.has(chave)) continue;
        vistas.add(chave);
        saida.push({ rotulo: mapa.get(chave)?.rotulo ?? chave, href: `/${chave}` });
        if (saida.length >= quantidade) break;
      }
      return saida;
    },
  };
}

// ---------------------------------------------------------------- Árvore estática (menu de navegacao.ts)

const CATEGORIAS_NAVEGACAO: CategoriaBase[] = [];
const LINKS_NAVEGACAO: Elo[] = [];
function registrar(href: string, rotulo: string) {
  LINKS_NAVEGACAO.push({ rotulo, href });
  const chave = chaveDe(href);
  if (chave && !ehFaceta(chave)) CATEGORIAS_NAVEGACAO.push({ chave, rotulo });
}
for (const item of NAVEGACAO) {
  registrar(item.href, item.rotulo);
  for (const coluna of item.colunas) {
    registrar(coluna.href, coluna.titulo);
    for (const link of coluna.links) registrar(link.href, link.rotulo);
  }
}
const PRINCIPAIS_NAVEGACAO = NAVEGACAO.map((item) => chaveDe(item.href)).filter((chave): chave is string => Boolean(chave));

export const ARVORE_ESTATICA = criarArvoreCategorias(CATEGORIAS_NAVEGACAO, LINKS_NAVEGACAO, PRINCIPAIS_NAVEGACAO);

export const CATEGORIAS_EXISTENTES = ARVORE_ESTATICA.existentes;
export const buscarCategoria = ARVORE_ESTATICA.buscarCategoria;
export const rotuloFaceta = ARVORE_ESTATICA.rotuloFaceta;
export const irmas = ARVORE_ESTATICA.irmas;
export const caminhosParaPreGerar = ARVORE_ESTATICA.caminhosParaPreGerar;
export const categoriasRelacionadas = ARVORE_ESTATICA.categoriasRelacionadas;
