import type { MetadataRoute } from "next";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { ORIGEM } from "@/loja/lib/seo/config";
import { PAGINAS_INSTITUCIONAIS } from "@/loja/lib/seo/institucional";

// Home, Pronta entrega, Edição do mês e as categorias do menu (navegacao.ts), com as facetas indexáveis
// (/kit-berco/kits/menina). Os PRODUTOS entram quando o catálogo é o real (cadastro do ERP), cada um com as
// fotos (sitemap de imagens); com o catálogo de exemplo (noindex) ficam de fora.
// Dentro de Personalizado, só a raiz: as páginas internas ainda são de exemplo (noindex).
// Conteúdo institucional indexável (ajuda, políticas, sobre, indique) entra no fim; a conta não.
// Nunca priority/changefreq (ignorados por Google e Bing). Regras em publicacao.md §3.
// Com mais de 50.000 URLs, dividir com generateSitemaps (um arquivo por tipo).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [arvore, catalogo] = await Promise.all([arvoreDaLoja(), catalogoDaLoja()]);
  const categorias = arvore
    .caminhosParaPreGerar()
    .filter((partes) => partes[0] !== "personalizado")
    .map((partes) => `/${partes.join("/")}`)
    .sort();
  const paginas: MetadataRoute.Sitemap = ["", "/pronta-entrega", ROTA_EDICAO, "/personalizado", ...categorias, ...PAGINAS_INSTITUCIONAIS].map((caminho) => ({
    url: `${ORIGEM}${caminho}`,
  }));
  const produtos: MetadataRoute.Sitemap = catalogo.origem !== "banco" ? [] : catalogo.produtos.map((produto) => ({
    url: `${ORIGEM}/produto/${produto.slug}`,
    images: (produto.imagens ?? []).slice(0, 6).map((imagem) => new URL(imagem.src, ORIGEM).href),
  }));
  return [...paginas, ...produtos];
}
