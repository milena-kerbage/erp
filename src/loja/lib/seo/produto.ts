import type { BreadcrumbList, Product, Review, WithContext } from "schema-dts";
import type { RespostaAvaliacoes } from "@/loja/lib/avaliacoes/regras";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { semPreco } from "@/loja/lib/formatacao/moeda";
import { ORIGEM } from "./config";
import { corDe, grupoDe, materialDe, precoDe, precoDecimal, prontaEntrega } from "./merchant";

// JSON-LD da página de produto (seo.md §6.3 e §6.6): Product + Offer + BreadcrumbList, no HTML
// inicial. Relações do "compre junto" em isOftenBoughtWith (schema 30.1). AggregateRating só com
// avaliações reais coletadas no site e APROVADAS na moderação do ERP (AggregateRating + as Review da
// primeira página): sem avaliação aprovada, nenhum dos dois sai.
// Disponibilidade, preço, cor, material e grupo vêm de ./merchant, a mesma fonte do feed do Merchant Center
// (/feeds/google-merchant.xml): o Google confere feed × página × dados estruturados.

export function schemaProduto(produto: Produto, relacionados: Produto[], avaliacoes?: RespostaAvaliacoes | null, agora = new Date()): WithContext<Product> {
  const resumo = avaliacoes?.resumo;
  const url = `${ORIGEM}/produto/${produto.slug}`;
  const de = precoDe(produto), cor = corDe(produto), material = materialDe(produto), grupo = grupoDe(produto);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#produto`,
    name: produto.nome,
    description: produto.resumo,
    sku: produto.sku,
    mpn: produto.sku, // peças do ateliê não têm GTIN: o código do ateliê identifica a peça
    brand: { "@type": "Brand", name: produto.marca },
    ...(cor ? { color: cor } : {}),
    ...(material ? { material } : {}),
    // Enxoval de bebê: público de 0 a 1 ano.
    audience: { "@type": "PeopleAudience", suggestedMinAge: 0, suggestedMaxAge: 1 },
    // A mesma peça em outras cores: todas as cores apontam para o mesmo grupo.
    ...(grupo ? { inProductGroupWithID: grupo } : {}),
    category: produto.trilha.map((item) => item.rotulo).join(" > "),
    // Fotos reais do produto (até 6); sem foto, a imagem de compartilhamento dele.
    image: produto.imagens?.length ? produto.imagens.slice(0, 6).map((imagem) => new URL(imagem.src, ORIGEM).href) : [`${ORIGEM}/og/produto/${produto.slug}`],
    additionalProperty: produto.ficha.flatMap((grupo) =>
      grupo.itens.map(([name, value]) => ({ "@type": "PropertyValue" as const, name, value })),
    ),
    isOftenBoughtWith: relacionados.map((outro) => ({ "@type": "Product", name: outro.nome, url: `${ORIGEM}/produto/${outro.slug}` })),
    // Sem preço cadastrado (R$ 0,00 = "Sob consulta"): nenhuma oferta, para não publicar um preço que não existe.
    // Sem shippingDetails: o frete é "a consultar" (combinado pelo WhatsApp), não há valor para declarar. A
    // política de devolução está no Organization (./organizacao.ts), válida para a loja toda.
    ...(semPreco(produto.preco)
      ? {}
      : {
          offers: {
            "@type": "Offer",
            url,
            price: precoDecimal(produto.preco),
            priceCurrency: "BRL",
            // Preço "de" riscado, quando o cadastro tem um maior que o atual.
            ...(de ? { priceSpecification: { "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: de, priceCurrency: "BRL" } } : {}),
            // Vale até o fim do ano seguinte (recalculado a cada geração da página).
            priceValidUntil: `${agora.getFullYear() + 1}-12-31`,
            // Pronta entrega = em estoque; o resto é feito sob encomenda no ateliê.
            availability: prontaEntrega(produto) ? "https://schema.org/InStock" : "https://schema.org/BackOrder",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": `${ORIGEM}/#organization` },
          },
        }),
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
