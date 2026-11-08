import type { Metadata } from "next";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { ArrowRight } from "@/loja/componentes/icones";
import { cartaoLink, gradeCartoes, prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ATUALIZACAO_POLITICAS, POLITICAS } from "@/loja/componentes/institucional/secoes";
import { EMPRESA } from "@/loja/lib/empresa";
import { metadataPagina } from "@/loja/lib/seo/institucional";

// Central das políticas da LOJA (www.). As do ERP (src/app/(erp)/(legal)) tratam do sistema interno e
// do atendimento pelo WhatsApp; estas tratam do site de compras.
export const metadata: Metadata = metadataPagina({
  titulo: "Políticas da loja",
  descricao:
    "Privacidade, termos de uso, cookies e trocas e devoluções da loja online do Ateliê Milena Kerbage, com os dados da empresa e os canais de contato.",
  caminho: "/politicas",
  indexar: true,
});

export default function Politicas() {
  return (
    <PaginaInstitucional
      trilha={[{ rotulo: "Políticas", href: "/politicas" }]}
      titulo="Políticas da loja"
      abertura="As regras do site de compras do ateliê, em linguagem direta: como usamos seus dados, como funciona o pedido e como trocar uma peça."
    >
      <ul className={gradeCartoes}>
        {POLITICAS.map((politica) => (
          <li key={politica.href}>
            <Link href={politica.href} className={cartaoLink}>
              <span className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3", fontSize: "lg", fontWeight: "medium" })}>
                {politica.rotulo}
                <ArrowRight size={18} aria-hidden className={css({ flexShrink: "0" })} />
              </span>
              <span className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{politica.resumo}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={cx(prosa, css({ mt: { base: "14", desktop: "20" } }))}>
        <h2 id="quem-vende">Quem vende</h2>
        <p>
          {EMPRESA.nomeFantasia} · {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
          <br />
          {EMPRESA.endereco}
        </p>
        <p>
          Atendimento: WhatsApp {EMPRESA.whatsapp.exibicao} e <a href={`mailto:${EMPRESA.emailAtendimento}`}>{EMPRESA.emailAtendimento}</a>.
          Privacidade e dados pessoais: <a href={`mailto:${EMPRESA.emailPrivacidade}`}>{EMPRESA.emailPrivacidade}</a>.
        </p>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>Políticas atualizadas em {ATUALIZACAO_POLITICAS}.</p>
      </div>

      <BlocoContato titulo="Ficou com alguma dúvida?" />
    </PaginaInstitucional>
  );
}
