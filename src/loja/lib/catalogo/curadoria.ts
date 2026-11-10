import type { ItemMenu } from "@/loja/componentes/layout/cabecalho/menu";
import type { Foto } from "./fotos";
import type { Produto } from "./exemplos";
import type { CatalogoLoja } from "./fonte";
import { buscarTexto, filtrar, noCaminho, slugificar } from "./listagem";
import { PRONTA_ENTREGA } from "./constantes";
import { filtrosDaQuery } from "./urlsListagem";
import { interpretarUrlListagem } from "@/loja/lib/seo/urls";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { dividirNome } from "@/loja/componentes/produto/dados";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import type { ProdutoSugerido } from "./sugestoes";

// Referências editoriais, nunca URLs de fotos: o cadastro ativo continua sendo a fonte de imagem,
// preço e destino. Ao arquivar uma peça ou trocar sua capa, home, menu e busca acompanham a mudança.
const SELECAO = ["kit-berco-sofia", "kit-berco-thomaz", "kit-berco-maria-heloisa", "kit-berco-azul-poa", "kit-berco-urso", "kit-berco-fazendinha", "kit-berco-richelieu-luxo", "kit-berco-bia"];
const CORES: Record<string, string[]> = {
  rose: ["kit-berco-sofia"], "azul-bebe": ["kit-berco-azul-poa", "kit-berco-barco"],
  "verde-salvia": ["kit-berco-thomaz"], cru: ["kit-berco-urso", "kit-berco-elegante"],
  cinza: ["kit-berco-cinza"], branco: ["kit-berco-richelieu-luxo"],
};
const ACABAMENTOS: Record<string, { slugs: string[]; indice?: number }> = {
  trico: { slugs: ["kit-berco-urso", "kit-berco-raul"], indice: 1 },
  bordado: { slugs: ["kit-berco-maria-heloisa", "kit-berco-sofia"], indice: 1 },
  renascenca: { slugs: ["kit-berco-richelieu-luxo", "kit-berco-sofia"], indice: 1 },
  nervuras: { slugs: ["kit-berco-lucas", "kit-berco-thomaz"] },
  xadrez: { slugs: ["kit-berco-xadrez", "kit-berco-maite-maria"] },
  safari: { slugs: ["kit-berco-safari"] },
};

export function produtosDoDestino(catalogo: CatalogoLoja, href: string): Produto[] {
  if (!href.startsWith("/") || href.startsWith("//")) return [];
  const url = new URL(href, "https://loja.invalid");
  if (url.pathname.startsWith("/produto/")) return catalogo.produtos.filter(p => p.slug === url.pathname.slice(9));
  if (url.pathname === "/busca") return filtrar(buscarTexto(catalogo.produtos, url.searchParams.get("q") ?? ""), filtrosDaQuery(url.searchParams));
  if (url.pathname === "/pronta-entrega") return filtrar(catalogo.produtos.filter(p => p.atributos.entrega?.includes(PRONTA_ENTREGA)), filtrosDaQuery(url.searchParams));
  if (url.pathname === "/edicao-do-mes") return produtosEmDestaque(catalogo, 24);
  if (/^\/personalizado(?:\/(menina|menino|floral|safari|classico|neutro|monte-o-seu|como-funciona|orcamento))?$/.test(url.pathname)) {
    const tema = url.pathname.split("/")[2];
    if (tema === "menina" || tema === "menino") return filtrar(catalogo.produtos, { para: [tema] });
    if (tema === "neutro") return filtrar(catalogo.produtos, { cor: ["branco", "cru"] });
    return ["floral", "safari", "classico"].includes(tema) ? buscarTexto(catalogo.produtos, tema) : catalogo.produtos;
  }
  const categorias = new Set(catalogo.categorias.map(c => c.chave));
  const leitura = interpretarUrlListagem(url.pathname, url.searchParams, categorias, REGRAS_SEO);
  if (leitura.tipo === "redirecionar" && leitura.destino !== href) return produtosDoDestino(catalogo, leitura.destino);
  return leitura.tipo === "ok" ? filtrar(noCaminho(catalogo.produtos, `/${leitura.listagem.categoria}`), leitura.listagem.filtros) : [];
}

export function escolherFoto(produtos: Produto[], preferidos: string[] = SELECAO, indice = 0): Foto | undefined {
  const ordenados = [...preferidos.flatMap(slug => produtos.filter(p => p.slug === slug)), ...produtos];
  for (const produto of ordenados) {
    const fotos = produto.imagens?.filter(f => f.src);
    const foto = fotos?.[indice] ?? fotos?.[0];
    if (foto) return { src: foto.src, alt: foto.alt || produto.nome };
  }
}

export function fotoDoDestino(catalogo: CatalogoLoja, href: string): Foto | undefined {
  const url = new URL(href, "https://loja.invalid");
  const cor = url.searchParams.get("cor") ?? "";
  const acabamento = ACABAMENTOS[slugificar(url.searchParams.get("q") ?? "")];
  if (url.pathname === "/busca" && acabamento) return escolherFoto(produtosDoDestino(catalogo, href), acabamento.slugs, acabamento.indice ?? 0);
  if (url.pathname === "/personalizado") return escolherFoto(catalogo.produtos, ["kit-berco-fazendinha", "kit-berco-bia"]);
  if (url.pathname === "/kit-berco/kits" && !cor) return escolherFoto(produtosDoDestino(catalogo, href), ["kit-berco-maria-heloisa", ...SELECAO]);
  if (url.pathname === "/kit-berco/kits/menino") return escolherFoto(produtosDoDestino(catalogo, href), ["kit-berco-azul-poa", "kit-berco-thomaz"]);
  return escolherFoto(produtosDoDestino(catalogo, href), CORES[cor] ?? SELECAO);
}

export function produtosEmDestaque(catalogo: CatalogoLoja, limite = 8): Produto[] {
  const preferidos = [...catalogo.maisVendidos, ...catalogo.produtos.filter(p => p.destaque).map(p => p.slug), ...SELECAO];
  const vistos = new Set<string>();
  return [...preferidos.flatMap(slug => catalogo.produtos.filter(p => p.slug === slug)), ...catalogo.produtos]
    .filter(p => { if (!p.imagens?.length || vistos.has(p.slug)) return false; vistos.add(p.slug); return true; }).slice(0, limite);
}

export function termosDaCuradoria(catalogo: Pick<CatalogoLoja, "produtos">): string[] {
  return ["kit berço", "bordado", "floral", "tricô", "linho", "safari", "rosê", "azul bebê"]
    .filter(termo => buscarTexto(catalogo.produtos, termo).length > 0);
}

export function sugestaoDoProduto(produto: Produto): ProdutoSugerido {
  const { base, variacao } = dividirNome(produto.nome);
  return { slug: produto.slug, href: `/produto/${produto.slug}`, nome: produto.nome, base, variacao,
    preco: formatarPreco(produto.preco), foto: escolherFoto([produto]), tom: "linho" };
}

export function menuComFotos(menu: ItemMenu[], catalogo: CatalogoLoja): ItemMenu[] {
  // Mantém imagens cadastradas pela equipe e completa apenas as mídias ainda vazias.
  const completar = <T extends { href: string; src?: string; alt?: string }>(item: T): T & { src?: string; alt?: string } => {
    if (item.src) return item;
    const foto = fotoDoDestino(catalogo, item.href);
    return foto ? { ...item, ...foto } : item;
  };
  return menu.map(item => {
    const painel = item.painel;
    let cards = painel.cards.map(completar);
    // O menu de kits começa pelas coleções que já têm fotografias e produtos disponíveis.
    if (item.id === "kit-berco" && cards.some(c => c.src)) {
      const atalhos = [
        { rotulo: "Para menina", href: "/kit-berco/kits/menina", tom: "rose" as const, icone: "flor" as const },
        { rotulo: "Para menino", href: "/kit-berco/kits/menino", tom: "azul" as const, icone: "berco" as const },
        { rotulo: "Com bordado", href: "/busca?q=bordado", tom: "linho" as const, icone: "agulha" as const },
      ].map(completar).filter(c => c.src);
      cards = [...cards.filter(c => c.src), ...atalhos].slice(0, 4);
    }
    if (painel.tipo === "cards" && cards.some(c => c.src)) cards = cards.filter(c => c.src);
    const semColecao = !produtosDoDestino(catalogo, item.href).length;
    const inspiracao = semColecao && !cards.some(c => c.src) ? escolherFoto(catalogo.produtos, ["kit-berco-fazendinha", "kit-berco-maria-heloisa"]) : undefined;
    if (inspiracao && painel.tipo === "colunas" && !painel.promo) cards = [
      completar({ rotulo: "Conheça os kits", href: "/kit-berco/kits", tom: "linho" as const, icone: "berco" as const }),
      completar({ rotulo: "Bordados do ateliê", href: "/busca?q=bordado", tom: "rose" as const, icone: "agulha" as const }),
    ].filter(c => c.src);
    return { ...item, painel: painel.tipo === "cards" ? { ...painel, cards } : {
      ...painel, cards, promo: inspiracao && painel.promo ? {
        titulo: "Inspire-se nos kits do ateliê", descricao: "Tecidos, bordados e conjuntos para preparar o cantinho do bebê.",
        href: "/kit-berco/kits", tom: "linho", icone: "berco", ...inspiracao,
      } : painel.promo ? completar(painel.promo) : undefined,
    } };
  });
}
