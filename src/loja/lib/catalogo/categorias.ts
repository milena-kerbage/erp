// Árvore de categorias da loja. PROVISÓRIO: montada a partir do menu do cabeçalho (navegacao.ts),
// que já é a lista oficial de categorias enquanto a API não existe. Chaves sem barra inicial, no
// formato do motor de URLs ("kit-berco/kits").

import { NAVEGACAO } from "@/loja/componentes/layout/cabecalho/navegacao";
import { REGRAS_SEO } from "@/loja/lib/seo/config";

export type Elo = { rotulo: string; href: string };
export type Categoria = { chave: string; rotulo: string; trilha: Elo[]; filhos: Elo[]; facetas: Elo[] };

const rotulos = new Map<string, string>();
const facetasPorCategoria = new Map<string, Elo[]>();

function chaveDe(href: string): string | null {
  if (!href.startsWith("/") || href.includes("?")) return null;
  return href.split("/").filter(Boolean).join("/");
}

// Link cujo último segmento é faceta indexável da categoria-mãe (ex.: kit-berco/kits/menina)
// não é categoria: é a página de faceta, montada pelo motor de URLs.
function registrar(href: string, rotulo: string) {
  const chave = chaveDe(href);
  if (!chave) return;
  const partes = chave.split("/");
  const mae = partes.slice(0, -1).join("/");
  const regra = REGRAS_SEO.categorias[mae];
  if (regra?.facetasIndexaveis.some((faceta) => faceta.valores.includes(partes.at(-1) ?? ""))) {
    const lista = facetasPorCategoria.get(mae) ?? [];
    if (!lista.some((elo) => elo.href === href)) lista.push({ rotulo, href });
    facetasPorCategoria.set(mae, lista);
    return;
  }
  if (!rotulos.has(chave)) rotulos.set(chave, rotulo);
}

for (const item of NAVEGACAO) {
  registrar(item.href, item.rotulo);
  for (const coluna of item.colunas) {
    registrar(coluna.href, coluna.titulo);
    for (const link of coluna.links) registrar(link.href, link.rotulo);
  }
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

const CATEGORIAS = new Map<string, Categoria>();
for (const [chave, rotulo] of rotulos) {
  const trilha: Elo[] = [];
  for (let mae = maeDe(chave); mae; mae = maeDe(mae)) trilha.unshift({ rotulo: rotulos.get(mae) ?? mae, href: `/${mae}` });
  const filhos = [...rotulos.keys()]
    .filter((outra) => maeDe(outra) === chave)
    .map((outra) => ({ rotulo: rotulos.get(outra) ?? outra, href: `/${outra}` }));
  CATEGORIAS.set(chave, { chave, rotulo, trilha, filhos, facetas: facetasPorCategoria.get(chave) ?? [] });
}

export const CATEGORIAS_EXISTENTES = new Set(CATEGORIAS.keys());

export function buscarCategoria(chave: string): Categoria | null {
  return CATEGORIAS.get(chave) ?? null;
}

// Rótulo do link de faceta no menu ("Para menina"), para o título da página.
export function rotuloFaceta(chave: string, caminhoCompleto: string): string | null {
  return facetasPorCategoria.get(chave)?.find((elo) => elo.href === caminhoCompleto)?.rotulo ?? null;
}

// Irmãs: para a página de uma folha (sem filhos) mostrar caminhos ao lado, como as fotos da Lululemon.
export function irmas(chave: string): Elo[] {
  const mae = maeDe(chave);
  if (!mae) return [];
  return (CATEGORIAS.get(mae)?.filhos ?? []).filter((elo) => elo.href !== `/${chave}`);
}

// Todos os caminhos que viram página estática no build (categorias + facetas do menu).
export function caminhosParaPreGerar(): string[][] {
  const facetas = [...facetasPorCategoria.values()].flat().map((elo) => chaveDe(elo.href) ?? "");
  return [...CATEGORIAS_EXISTENTES, ...facetas].filter(Boolean).map((chave) => chave.split("/"));
}

// Afinidade entre linhas (quem compra uma costuma levar a outra): base das sugestões de
// "Continue explorando" no fim da listagem. PROVISÓRIO até haver dados de compra conjunta.
const AFINS: Record<string, string[]> = {
  "kit-berco": ["enxoval/mantas", "quarto/cortinas", "quarto/tapetes", "kit-berco/lencois", "enxoval/paninhos", "quarto/mosquiteiros"],
  enxoval: ["maternidade/saidas", "maternidade/bolsas", "kit-berco/kits", "enxoval/kits", "quarto/trocador"],
  quarto: ["kit-berco/kits", "quarto/almofadas", "enxoval/mantas", "kit-berco/protetores", "maternidade/enfeites-de-porta"],
  maternidade: ["enxoval/paninhos", "enxoval/mantas", "maternidade/kits", "enxoval/kits", "kit-berco/kits"],
};

const PRINCIPAIS = NAVEGACAO.map((item) => chaveDe(item.href)).filter((chave): chave is string => Boolean(chave));

// Sugestões para o fim da listagem: irmãs da categoria, linhas afins e as categorias principais,
// sem repetir, sem a própria categoria nem as filhas (que já aparecem no topo da página).
export function categoriasRelacionadas(chaves: string[], quantidade = 12): Elo[] {
  const atuais = new Set(chaves);
  const filhas = new Set(chaves.flatMap((chave) => (CATEGORIAS.get(chave)?.filhos ?? []).map((elo) => elo.href.slice(1))));
  const candidatas = [
    ...chaves.flatMap((chave) => irmas(chave).map((elo) => elo.href.slice(1))),
    ...chaves.flatMap((chave) => AFINS[chave.split("/")[0]] ?? []),
    ...PRINCIPAIS,
  ];
  const vistas = new Set<string>();
  const saida: Elo[] = [];
  for (const chave of candidatas) {
    if (vistas.has(chave) || atuais.has(chave) || filhas.has(chave) || !CATEGORIAS.has(chave)) continue;
    vistas.add(chave);
    saida.push({ rotulo: CATEGORIAS.get(chave)?.rotulo ?? chave, href: `/${chave}` });
    if (saida.length >= quantidade) break;
  }
  return saida;
}
