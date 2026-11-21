import type { Graph } from "schema-dts";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { ORIGEM } from "./config";

// Quem é o ateliê para o Google (painel de conhecimento, nome do site nos resultados e a caixa de busca):
// Organization + OnlineStore e WebSite num grafo só, no HTML de todas as páginas públicas. O "@id" da
// organização é o que os produtos apontam em offers.seller (src/loja/lib/seo/produto.ts).
export function schemaDoSite(): Graph {
  // "Rua …, 233, Bairro, Fortaleza/CE, CEP 60181-245"
  const partes = EMPRESA.endereco.split(",").map((parte) => parte.trim());
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": `${ORIGEM}/#organization`,
        name: EMPRESA.nomeFantasia,
        legalName: EMPRESA.razaoSocial,
        url: ORIGEM,
        logo: `${ORIGEM}/vitrine/marca/logotipo-horizontal-black.svg`,
        image: `${ORIGEM}/og/inicio`,
        description: `${EMPRESA.segmento} feitos no ateliê, em ${EMPRESA.cidade}. ${EMPRESA.entrega}.`,
        email: EMPRESA.emailAtendimento,
        telephone: `+${EMPRESA.whatsapp.numero}`,
        taxID: EMPRESA.cnpj,
        address: { "@type": "PostalAddress", streetAddress: `${partes[0]}, ${partes[1]} - ${partes[2]}`, addressLocality: EMPRESA.cidade, addressRegion: EMPRESA.uf, postalCode: /CEP\s*([\d-]+)/.exec(EMPRESA.endereco)?.[1], addressCountry: "BR" },
        areaServed: { "@type": "Country", name: "Brasil" },
        contactPoint: { "@type": "ContactPoint", contactType: "sales", telephone: `+${EMPRESA.whatsapp.numero}`, availableLanguage: "Portuguese", areaServed: "BR" },
        sameAs: [REDES_SOCIAIS.instagram, REDES_SOCIAIS.linktree],
        // Política de devolução da loja toda, como está em /politicas/trocas: arrependimento em 7 dias corridos do
        // recebimento (art. 49 do CDC), com devolução pelo correio ou no ateliê. Sem returnFees: a página garante a
        // devolução dos valores pagos (inclusive o frete de envio), mas não diz quem paga o frete da volta.
        // Peças com bordado personalizado seguem a regra própria da página (defeito ou diferença do combinado).
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "BR",
          returnPolicyCountry: "BR",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: ["https://schema.org/ReturnByMail", "https://schema.org/ReturnInStore"],
          merchantReturnLink: `${ORIGEM}/politicas/trocas`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${ORIGEM}/#website`,
        url: ORIGEM,
        name: EMPRESA.nomeFantasia,
        alternateName: "Milena Kerbage Ateliê",
        inLanguage: "pt-BR",
        publisher: { "@id": `${ORIGEM}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${ORIGEM}/busca?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        } as never,
      },
    ],
  };
}
