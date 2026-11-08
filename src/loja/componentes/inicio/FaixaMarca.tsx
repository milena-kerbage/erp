import { css, cx } from "styled-system/css";
import { InstagramLogo } from "@/loja/componentes/icones";
import { FAIXA_MARCA } from "./conteudo";
import { botaoPrimario, textoGrande } from "./estilos";

// Faixa de marca (lululemon-referencia.md §3.10): de ponta a ponta, fundo suave, 48/40 de respiro
// (32/12 no celular); à esquerda a frase (Scarlett, sem acento) e o texto, à direita o botão escuro
// alinhado ao pé. Antes dela, o espaçador "small" de 48 px (32 no celular).
export function FaixaMarca() {
  return (
    <section aria-labelledby="titulo-marca" className={secao}>
      <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
        <h2 id="titulo-marca" className={frase}>
          {FAIXA_MARCA.frase}
        </h2>
        <p className={cx(textoGrande, css({ maxW: "[720px]" }))}>{FAIXA_MARCA.texto}</p>
      </div>
      <a href={FAIXA_MARCA.acao.href} target="_blank" rel="noopener" className={cx(botaoPrimario, css({ flexShrink: "0" }))}>
        <InstagramLogo size={16} aria-hidden /> {FAIXA_MARCA.acao.rotulo}
      </a>
    </section>
  );
}

const secao = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "flex-end" },
  justifyContent: "space-between",
  gap: { base: "8", md: "10" },
  mt: { base: "8", desktop: "12" },
  px: { base: "3", md: "5", desktop: "10" },
  py: { base: "8", desktop: "12" },
  bg: "fundoSutil",
});

// Scarlett (fonte da marca) só aqui: frase curta e sem acento.
const frase = css({
  fontFamily: "marca",
  fontWeight: "normal",
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  lineHeight: "titulo",
  color: "marca",
});
