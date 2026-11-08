import type { Metadata } from "next";
import type { BreadcrumbList, FAQPage, WithContext } from "schema-dts";
import { ORIGEM } from "./config";

// SEO das páginas institucionais (ajuda, políticas, sobre, indique) e da conta neste aparelho.
// Título e descrição próprios, canonical na URL pública e robots conforme o tipo: conteúdo
// institucional é indexável; a conta (dados só do navegador) fica fora do índice.

export type Elo = { rotulo: string; href: string };

export function metadataPagina({
  titulo,
  descricao,
  caminho,
  indexar,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
  indexar: boolean;
}): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho, type: "website" },
    robots: indexar ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export function schemaTrilha(itens: Elo[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ rotulo: "Página inicial", href: "/" }, ...itens].map((item, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: item.rotulo,
      item: `${ORIGEM}${item.href === "/" ? "" : item.href}`,
    })),
  };
}

export function schemaPerguntas(perguntas: Array<{ pergunta: string; resposta: string }>): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}

// Páginas institucionais indexáveis: fonte única para o sitemap (src/app/(site)/loja/sitemap.ts).
export const PAGINAS_INSTITUCIONAIS = [
  "/sobre",
  "/indique",
  "/ajuda",
  "/ajuda/como-fazer-pedido",
  "/ajuda/entregas",
  "/ajuda/trocas-e-devolucoes",
  "/ajuda/bordado-personalizado",
  "/ajuda/tecidos-e-cuidados",
  "/ajuda/perguntas-frequentes",
  "/politicas",
  "/politicas/privacidade",
  "/politicas/termos",
  "/politicas/cookies",
  "/politicas/trocas",
] as const;
