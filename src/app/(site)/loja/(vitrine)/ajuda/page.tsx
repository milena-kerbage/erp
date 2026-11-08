import type { Metadata } from "next";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { ArrowRight } from "@/loja/componentes/icones";
import { BuscaAjuda } from "@/loja/componentes/institucional/BuscaAjuda";
import { cartaoLink, gradeCartoes, tituloSecao } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { POLITICAS } from "@/loja/componentes/institucional/secoes";
import { ROTA_AJUDA, TEMAS_AJUDA } from "@/loja/lib/ajuda/conteudo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

// Central de ajuda: busca simples nas perguntas e os temas (pedido, entregas, trocas, bordado,
// cuidados e perguntas frequentes), com as políticas e o contato no fim.
export const metadata: Metadata = metadataPagina({
  titulo: "Central de ajuda",
  descricao:
    "Ajuda da loja do Ateliê Milena Kerbage: como fazer o pedido pelo WhatsApp, entregas e retirada em Fortaleza, trocas e devoluções, bordado personalizado e cuidados com as peças.",
  caminho: ROTA_AJUDA,
  indexar: true,
});

export default function CentralDeAjuda() {
  return (
    <PaginaInstitucional
      trilha={[{ rotulo: "Ajuda", href: ROTA_AJUDA }]}
      titulo="Como podemos ajudar?"
      abertura="Encontre respostas sobre o pedido pelo WhatsApp, as entregas, as trocas e os cuidados com as peças do ateliê."
    >
      <BuscaAjuda />

      <section aria-labelledby="titulo-temas" className={css({ mt: { base: "14", desktop: "20" } })}>
        <h2 id="titulo-temas" className={tituloSecao}>
          Temas
        </h2>
        <ul className={cx(gradeCartoes, css({ mt: "6" }))}>
          {TEMAS_AJUDA.map((tema) => (
            <li key={tema.slug}>
              <Link href={`${ROTA_AJUDA}/${tema.slug}`} className={cartaoLink}>
                <span className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3", fontSize: "lg", fontWeight: "medium" })}>
                  {tema.titulo}
                  <ArrowRight size={18} aria-hidden className={css({ flexShrink: "0" })} />
                </span>
                <span className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{tema.resumo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-politicas" className={css({ mt: { base: "14", desktop: "20" } })}>
        <h2 id="titulo-politicas" className={tituloSecao}>
          Políticas da loja
        </h2>
        <ul className={css({ display: "flex", flexWrap: "wrap", columnGap: "6", rowGap: "3", mt: "6" })}>
          {POLITICAS.map((politica) => (
            <li key={politica.href}>
              <Link href={politica.href} className={css({ fontSize: "md", color: "escuro", textDecoration: "underline", textUnderlineOffset: "[4px]", _hover: { textDecorationColor: "marca" } })}>
                {politica.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <BlocoContato />
    </PaginaInstitucional>
  );
}
