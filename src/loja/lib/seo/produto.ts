import type { BreadcrumbList, Product, Review, WithContext } from "schema-dts";
import type { RespostaAvaliacoes } from "@/loja/lib/avaliacoes/regras";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { ORIGEM } from "./config";

// JSON-LD da página de produto (seo.md §6.3 e §6.6): Product + Offer + BreadcrumbList, no HTML
// inicial. Relações do "compre junto" em isOftenBoughtWith (schema 30.1). AggregateRating só com
// avaliações reais coletadas no site e APROVADAS na moderação do ERP (AggregateRating + as Review da
// primeira página): sem avaliação aprovada, nenhum dos dois sai.

export function schemaProduto(produto: Produto, relacionados: Produto[], avaliacoes?: RespostaAvaliacoes | null): WithContext<Product> {
  const resumo = avaliacoes?.resumo;
  const url = `${ORIGEM}/produto/${produto.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#produto`,
    name: produto.nome,
    description: produto.resumo,
    sku: produto.sku,
    brand: { "@type": "Brand", name: produto.marca },
    category: produto.trilha.map((item) => item.rotulo).join(" > "),
    image: [`${ORIGEM}/opengraph-image`], // trocar pelas fotos reais (≥ 1200 px) quando chegarem
    additionalProperty: produto.ficha.flatMap((grupo) =>
      grupo.itens.map(([name, value]) => ({ "@type": "PropertyValue" as const, name, value })),
    ),
    isOftenBoughtWith: relacionados.map((outro) => ({ "@type": "Product", name: outro.nome, url: `${ORIGEM}/produto/${outro.slug}` })),
    offers: {
      "@type": "Offer",
      url,
      price: produto.preco,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${ORIGEM}/#organization` },
    },
    ...(avaliacoes && resumo && resumo.total > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: resumo.media.toFixed(1),
            ratingCount: resumo.total,
            reviewCount: resumo.total,
            bestRating: 5,
            worstRating: 1,
          },
          review: avaliacoes.avaliacoes.map(
            (avaliacao): Review => ({
              "@type": "Review",
              name: avaliacao.titulo,
              reviewBody: avaliacao.texto,
              datePublished: avaliacao.criadaEm.slice(0, 10),
              author: { "@type": "Person", name: avaliacao.nome },
              reviewRating: { "@type": "Rating", ratingValue: avaliacao.nota, bestRating: 5, worstRating: 1 },
            }),
          ),
        }
      : {}),
  };
}

export function schemaTrilha(produto: Produto): WithContext<BreadcrumbList> {
  const itens = [{ rotulo: "Página inicial", href: "/" }, ...produto.trilha, { rotulo: produto.nome, href: `/produto/${produto.slug}` }];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: item.rotulo,
      item: `${ORIGEM}${item.href}`,
    })),
  };
}

// JSON dentro de <script>: "<" escapado para nenhum texto do catálogo fechar a tag.
export function jsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}
