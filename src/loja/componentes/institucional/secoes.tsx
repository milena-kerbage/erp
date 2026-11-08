import type { Metadata } from "next";
import { css } from "styled-system/css";
import { perguntasDoTema, ROTA_AJUDA, TEMAS_AJUDA, temaAjuda } from "@/loja/lib/ajuda/conteudo";
import { metadataPagina } from "@/loja/lib/seo/institucional";
import { Acordeao } from "./Acordeao";
import { NavSecao } from "./PaginaInstitucional";
import { tituloSecao } from "./estilos";

// Peças comuns das seções Ajuda e Políticas: navegação lateral, metadata e as perguntas do tema.

// Data da versão das políticas da loja (mudou o texto de uma política? atualize).
export const ATUALIZACAO_POLITICAS = "8 de novembro de 2026";

export const POLITICAS = [
  { rotulo: "Privacidade", href: "/politicas/privacidade", resumo: "Quais dados a loja usa, para quê, com quem compartilha e os seus direitos." },
  { rotulo: "Termos de uso", href: "/politicas/termos", resumo: "Como funcionam o catálogo, os preços, o pedido pelo WhatsApp e o uso do site." },
  { rotulo: "Cookies e armazenamento", href: "/politicas/cookies", resumo: "Os cookies e os dados que a loja guarda no seu navegador, e como apagar." },
  { rotulo: "Trocas e devoluções", href: "/politicas/trocas", resumo: "Direito de arrependimento, peças com defeito e peças personalizadas." },
] as const;

export function LateralAjuda({ atual }: { atual?: string }) {
  return (
    <NavSecao
      titulo="Temas de ajuda"
      atual={atual}
      links={[{ rotulo: "Central de ajuda", href: ROTA_AJUDA }, ...TEMAS_AJUDA.map((tema) => ({ rotulo: tema.titulo, href: `${ROTA_AJUDA}/${tema.slug}` }))]}
    />
  );
}

export function LateralPoliticas({ atual }: { atual?: string }) {
  return <NavSecao titulo="Políticas da loja" atual={atual} links={[{ rotulo: "Todas as políticas", href: "/politicas" }, ...POLITICAS]} />;
}

export function metadataTema(slug: string): Metadata {
  const tema = temaAjuda(slug);
  return metadataPagina({ titulo: tema.titulo, descricao: tema.descricao, caminho: `${ROTA_AJUDA}/${slug}`, indexar: true });
}

export function trilhaTema(slug: string) {
  return [
    { rotulo: "Ajuda", href: ROTA_AJUDA },
    { rotulo: temaAjuda(slug).titulo, href: `${ROTA_AJUDA}/${slug}` },
  ];
}

// "Perguntas sobre este tema": as do tema em acordeão (abrem pela âncora vinda da busca).
export function PerguntasDoTema({ slug, titulo = "Perguntas sobre este tema" }: { slug: string; titulo?: string }) {
  const perguntas = perguntasDoTema(slug);
  if (perguntas.length === 0) return null;
  return (
    <section aria-labelledby="titulo-perguntas-tema" className={css({ mt: { base: "16", desktop: "20" }, maxW: "leitura" })}>
      <h2 id="titulo-perguntas-tema" className={tituloSecao}>
        {titulo}
      </h2>
      <div className={css({ mt: "6" })}>
        <Acordeao itens={perguntas} />
      </div>
    </section>
  );
}
