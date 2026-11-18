import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { ImagemNativa as Image } from "@/loja/componentes/produto/ImagemNativa";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { listarProjetos, projetosEmDestaque } from "@/loja/lib/casas/catalogo";
import { fotoAtelie } from "@/loja/lib/fotosAtelie";
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
            Personalizado
          </p>
          <h2 id="titulo-projetos-home" className={frase}>
            O quartinho inteiro, planejado pelo ateliê.
          </h2>
          <p className={css({ mt: "4", maxW: "[40ch]", fontSize: { base: "md", lg: "lg" }, lineHeight: "relaxed", color: "texto" })}>
            Kit berço, almofadas, ninho e complementares no mesmo tema, feitos no ateliê em Fortaleza e entregues em todo o
            Brasil. Qualquer item pode ser personalizado.
          </p>
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "7" })}>
            <Link href="/personalizado" className={botao({ variante: "escuro", tamanho: "m" })}>
              Ver os quartinhos
            </Link>
            <Link href="/personalizado/monte-o-seu" className={botao({ variante: "contorno", tamanho: "m" })}>
              Monte o seu quartinho
            </Link>
          </div>
        </div>
        <div className={ilustracao}>
          <Image src={fotoAtelie("quarto-floral").src} alt={fotoAtelie("quarto-floral").alt} fill sizes="320px" className={css({ objectFit: "cover" })} />
        </div>
      </section>
      <VitrineProjetos
        id="titulo-vitrine-projetos"
        titulo="Escolha o seu."
        complemento="Floral, safári, nuvens ou clássico."
        projetos={projetos}
        acao={{ rotulo: "Ver todos os quartinhos", href: "/personalizado" }}
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
  position: "relative",
  overflow: "hidden",
  borderRadius: "full",
  bg: "fundoProduto",
});
