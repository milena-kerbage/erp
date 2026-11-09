import type { MetadataRoute } from "next";
import { arvoreDaLoja } from "@/lib/loja/catalogo";
import { ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { ORIGEM } from "@/loja/lib/seo/config";
import { PAGINAS_INSTITUCIONAIS } from "@/loja/lib/seo/institucional";

// Home, Pronta entrega, Edição do mês e as categorias do menu (navegacao.ts), com as facetas indexáveis
// (/kit-berco/kits/menina). Produtos ficam de fora enquanto o catálogo é de exemplo (noindex).
// Dentro de Projetos, só a raiz: as páginas internas são da área Projetos, que lista as suas.
// Conteúdo institucional indexável (ajuda, políticas, sobre, indique) entra no fim; a conta não.
// Quando o catálogo existir, usar generateSitemaps (um arquivo por tipo: categorias, facetas,
// produtos, conteúdo; ≤ 50.000 URLs cada), buscando da API com a tag "sitemap" e lastmod real.
// Nunca priority/changefreq (ignorados por Google e Bing). Regras em publicacao.md §3.
// As categorias vêm do cadastro do ERP (ou do menu estático, no fallback): src/lib/loja/catalogo.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categorias = (await arvoreDaLoja())
    .caminhosParaPreGerar()
    .filter((partes) => partes[0] !== "personalizado")
    .map((partes) => `/${partes.join("/")}`)
    .sort();
  return ["", "/pronta-entrega", ROTA_EDICAO, "/personalizado", ...categorias, ...PAGINAS_INSTITUCIONAIS].map((caminho) => ({
    url: `${ORIGEM}${caminho}`,
  }));
}
