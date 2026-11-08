import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { Baby } from "@/loja/componentes/icones";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { listarProjetos, projetosEmDestaque } from "@/loja/lib/casas/catalogo";
import { VitrineProjetos } from "./secoes";

// Bloco "Projetos" da home: faixa de abertura em sálvia clara com a chamada e as ações e, logo
// abaixo, a vitrine com os projetos (os em destaque primeiro). Ainda sem fotos: a faixa usa o ícone
// de bebê em traço fino como ilustração. Nome do componente mantido por compatibilidade (a home da
// vitrine importa CasasNaHome).
export function CasasNaHome() {
  const destaques = projetosEmDestaque();
  const projetos = [...destaques, ...listarProjetos().filter((projeto) => !destaques.includes(projeto))].slice(0, 10);
  return (
    <div className={css({ mt: { base: "16", lg: "24" } })}>
      <section aria-labelledby="titulo-projetos-home" className={banner}>
        <div className={conteudo}>
          <p className={css({ fontSize: "sm", fontWeight: "medium", letterSpacing: "[0.12em]", textTransform: "uppercase", color: "marca" })}>
            Projetos
          </p>
          <h2 id="titulo-projetos-home" className={frase}>
            O quartinho inteiro, planejado pelo ateliê.
          </h2>
          <p className={css({ mt: "4", maxW: "[40ch]", fontSize: { base: "md", lg: "lg" }, lineHeight: "relaxed", color: "texto" })}>
            Kit berço, cortina, tapete, almofadas e enfeite de porta no mesmo tema, feitos à mão em Fortaleza e entregues em todo o
            Brasil.
          </p>
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "7" })}>
            <Link href="/projetos" className={botao({ variante: "escuro", tamanho: "m" })}>
              Ver os projetos
            </Link>
            <Link href="/projetos/orcamento" className={botao({ variante: "contorno", tamanho: "m" })}>
              Peça seu projeto
            </Link>
          </div>
        </div>
        <div aria-hidden className={ilustracao}>
          <Baby weight="thin" className={cx(css({ w: "full", h: "full", color: "marca" }))} />
        </div>
      </section>
      <VitrineProjetos
        id="titulo-vitrine-projetos"
        titulo="Escolha o seu."
        complemento="Floral, safári, nuvens ou clássico."
        projetos={projetos}
        acao={{ rotulo: "Ver todos os projetos", href: "/projetos" }}
      />
    </div>
  );
}

const banner = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "minmax(0, 1.4fr) minmax(0, 1fr)" },
  alignItems: "center",
  gap: { base: "8", md: "12" },
  px: RESPIRO_LATERAL,
  py: { base: "14", lg: "24" },
  bg: "marcaSuave",
});

const conteudo = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });

const frase = css({
  mt: "4",
  maxW: "[18ch]",
  fontFamily: "corpo",
  fontSize: { base: "3xl", md: "4xl", xl: "5xl" },
  fontWeight: "normal",
  lineHeight: "[1.08]",
  letterSpacing: "[-0.035em]",
  color: "escuro",
});

const ilustracao = css({
  display: { base: "none", md: "block" },
  justifySelf: "center",
  w: "[min(100%, 320px)]",
  aspectRatio: "square",
  p: "10",
  borderRadius: "full",
  bg: "fundoProduto",
});
