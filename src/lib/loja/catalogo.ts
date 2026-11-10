import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { lerCatalogoDoBanco } from "@/lib/loja/gestao/catalogoBanco";
import { type ItemMenu, montarMenu } from "@/loja/componentes/layout/cabecalho/menu";
import { catalogoParaCarrinho, type ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import type { ArvoreCategorias } from "@/loja/lib/catalogo/categorias";
import { arvoreDoCatalogo, type CatalogoLoja, catalogoEstatico, type IndiceCatalogo, indiceDoCatalogo } from "@/loja/lib/catalogo/fonte";

// Catálogo da LOJA lido do cadastro do ERP (erp_core, migração 010), com cache entre requisições
// (unstable_cache, 1 h) por tag, invalidado na hora pelas escritas do ERP (revalidateTag em
// src/lib/loja/gestao/cache.ts). FALLBACK: banco sem produto ativo, sem a migração 010 ou fora do ar →
// o catálogo de exemplo em código (src/loja/lib/catalogo/exemplos.ts…). A loja nunca quebra por isso.
// Erros NÃO entram no cache (a próxima requisição tenta o banco de novo); "banco vazio" entra (até a
// primeira escrita do ERP invalidar a tag).

export const TAGS_LOJA = { catalogo: "loja:catalogo", menu: "loja:menu", cupons: "loja:cupons" } as const;

// Uma leitura do catálogo são ~10 consultas (alguns segundos pelo pooler). Quando muitas páginas
// regeneram juntas (build, ou o ERP acabou de invalidar a tag), cada uma pediria a sua e todas fariam
// fila na mesma conexão até estourar o tempo limite. Leitura única por processo: quem chega durante uma
// leitura em andamento espera a mesma. Uma nova tentativa curta cobre a falha passageira do pooler.
let leituraEmAndamento: ReturnType<typeof lerCatalogoDoBanco> | null = null;
async function lerComNovaTentativa() {
  try {
    return await lerCatalogoDoBanco();
  } catch {
    await new Promise((resolver) => setTimeout(resolver, 750));
    return lerCatalogoDoBanco();
  }
}
function lerUmaVez() {
  leituraEmAndamento ??= lerComNovaTentativa().finally(() => {
    leituraEmAndamento = null;
  });
  return leituraEmAndamento;
}

const doBanco = unstable_cache(async () => lerUmaVez(), ["loja-catalogo-v1"], {
  tags: [TAGS_LOJA.catalogo, TAGS_LOJA.menu, TAGS_LOJA.cupons],
  revalidate: 3600,
});

let avisou = false;

/** O catálogo da loja (uma leitura por requisição; o retrato vem do cache por tag). */
export const catalogoDaLoja = cache(async (): Promise<CatalogoLoja> => {
  // Sem banco configurado (build ou ambiente sem DATABASE_URL e sem SQLite local): direto o de exemplo.
  if (!process.env.DATABASE_URL && process.env.ALLOW_LOCAL_SQLITE !== "true") return catalogoEstatico();
  try {
    return (await doBanco()) ?? catalogoEstatico();
  } catch (erro) {
    if (!avisou) {
      avisou = true;
      console.warn(`[loja] Catálogo do banco indisponível (${erro instanceof Error ? erro.message : "erro"}); usando o catálogo de exemplo. Confira o banco e a migração 010.`);
    }
    return catalogoEstatico();
  }
});

/** Índices do catálogo: buscarProduto, buscarVarios, listarSlugs e coleções. */
export async function indiceDaLoja(): Promise<IndiceCatalogo & { catalogo: CatalogoLoja }> {
  const catalogo = await catalogoDaLoja();
  return { ...indiceDoCatalogo(catalogo), catalogo };
}

/** Árvore de categorias (a estática quando o catálogo é o de exemplo). */
export async function arvoreDaLoja(): Promise<ArvoreCategorias> {
  return arvoreDoCatalogo(await catalogoDaLoja(), montarMenu);
}

/** Menu do cabeçalho: o cadastrado no ERP ou o estático. */
export async function menuDaLoja(): Promise<ItemMenu[]> {
  return (await catalogoDaLoja()).menu ?? montarMenu();
}

/** O essencial de cada produto para a sacola, o pedido e o recálculo do servidor. */
export async function catalogoDaSacola(): Promise<ProdutoCarrinho[]> {
  return catalogoParaCarrinho((await catalogoDaLoja()).produtos);
}
