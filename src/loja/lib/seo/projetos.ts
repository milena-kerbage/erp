import type { BreadcrumbList, CollectionPage, Product, WithContext } from "schema-dts";
import { fotosDoProjeto, PACOTES, type Projeto, precoDoPacote, rotuloEstilo, rotuloTecido, rotuloTema } from "@/loja/lib/casas/catalogo";
import { EMPRESA } from "@/loja/lib/empresa";
import { ORIGEM } from "./config";

// JSON-LD da área Projetos (quarto de bebê completo). O projeto sai como Product com AggregateOffer
// (do pacote Essencial ao Completo personalizado), marca do ateliê e as características do projeto
// em additionalProperty. ATENÇÃO: os preços do catálogo são fictícios; as páginas estão fora do
// índice (robots noindex) até o catálogo real entrar. Listagem: CollectionPage + ItemList, sem
// Product (seo.md §4).

export function schemaProjeto(projeto: Projeto): WithContext<Product> {
  const url = `${ORIGEM}/projetos/${projeto.slug}`;
  const precos = PACOTES.map((pacote) => precoDoPacote(projeto, pacote.nome));
  const fotos = fotosDoProjeto(projeto).map((foto) => `${ORIGEM}${foto.src}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#projeto`,
    name: projeto.nome,
    url,
    description: projeto.descricao.join(" "),
    ...(fotos.length ? { image: fotos } : {}),
    brand: { "@type": "Brand", name: EMPRESA.nomeFantasia },
    category: "Quarto de bebê",
    color: projeto.paleta.map((cor) => cor.nome).join(", "),
    material: rotuloTecido(projeto.tecido),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: Math.min(...precos),
      highPrice: Math.max(...precos),
      offerCount: PACOTES.length,
      url,
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Tema", value: rotuloTema(projeto.tema) },
      { "@type": "PropertyValue", name: "Estilo", value: rotuloEstilo(projeto.estilo) },
      { "@type": "PropertyValue", name: "Prazo de produção (dias úteis)", value: projeto.prazoDiasUteis },
    ],
  };
}

export function schemaTrilhaProjetos(itens: Array<{ rotulo: string; href: string }>): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ rotulo: "Página inicial", href: "/" }, ...itens].map((item, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: item.rotulo,
      item: `${ORIGEM}${item.href}`,
    })),
  };
}

export function schemaListagemProjetos(titulo: string, caminho: string, projetos: Projeto[]): WithContext<CollectionPage> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${ORIGEM}${caminho}#pagina`,
    name: titulo,
    url: `${ORIGEM}${caminho}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: projetos.length,
      itemListElement: projetos.map((projeto, indice) => ({
        "@type": "ListItem",
        position: indice + 1,
        name: projeto.nome,
        url: `${ORIGEM}/projetos/${projeto.slug}`,
      })),
    },
  };
}
