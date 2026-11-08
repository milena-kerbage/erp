import type { MetadataRoute } from "next";
import { caminhosParaPreGerar } from "@/loja/lib/catalogo/categorias";
import { ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { ORIGEM } from "@/loja/lib/seo/config";

// Home, Pronta entrega, Edição do mês e as categorias do menu (navegacao.ts), com as facetas indexáveis
// (/kit-berco/kits/menina). Produtos ficam de fora enquanto o catálogo é de exemplo (noindex).
// Dentro de Projetos, só a raiz: as páginas internas são da área Projetos, que lista as suas.
// Quando o catálogo existir, usar generateSitemaps (um arquivo por tipo: categorias, facetas,
// produtos, conteúdo; ≤ 50.000 URLs cada), buscando da API com a tag "sitemap" e lastmod real.
// Nunca priority/changefreq (ignorados por Google e Bing). Regras em publicacao.md §3.
export default function sitemap(): MetadataRoute.Sitemap {
  const categorias = caminhosParaPreGerar()
    .filter((partes) => partes[0] !== "projetos")
    .map((partes) => `/${partes.join("/")}`)
    .sort();
  return ["", "/pronta-entrega", ROTA_EDICAO, "/projetos", ...categorias].map((caminho) => ({ url: `${ORIGEM}${caminho}` }));
}
