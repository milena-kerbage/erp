import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { montarUrlListagem, normalizarBusca, ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Onde a listagem está: uma categoria (URL do motor, com facetas indexáveis no caminho) ou a busca
// interna (/busca?q=…, nunca indexável). Mesma função no servidor (links, paginação, chips) e no
// navegador (gaveta de filtros), para a URL nunca divergir.
export type Contexto = { tipo: "categoria"; categoria: string } | { tipo: "busca"; termo: string };

export function montarUrl(contexto: Contexto, filtros: Record<string, string[]>, ordem?: string, pagina = 1): string {
  if (contexto.tipo === "categoria") {
    return montarUrlListagem({ categoria: contexto.categoria, filtros, ordem, pagina }, REGRAS_SEO).url;
  }
  const query = new URLSearchParams({ q: normalizarBusca(contexto.termo) });
  for (const chave of Object.keys(filtros).sort()) {
    if (filtros[chave].length) query.set(chave, [...filtros[chave]].sort().join(","));
  }
  if (ordem && ordem !== ORDEM_PADRAO) query.set("ordem", ordem);
  if (pagina > 1) query.set("pagina", String(pagina));
  return `/busca?${query.toString().replace(/%2C/g, ",")}`;
}

// Lê os filtros aceitos de uma query (busca); a categoria usa interpretarUrlListagem.
export function filtrosDaQuery(busca: URLSearchParams): Record<string, string[]> {
  const filtros: Record<string, string[]> = {};
  for (const chave of REGRAS_SEO.parametrosFiltro) {
    const valor = busca.get(chave);
    if (valor) filtros[chave] = valor.split(",").filter(Boolean).slice(0, 10);
  }
  return filtros;
}
