"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight, Pause, Play } from "@/loja/componentes/icones";
import { botaoSecundario } from "@/loja/componentes/inicio/estilos";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import type { FotoGaleria } from "./dados";
import { FotoSlide } from "./FotoSlide";
import { revelarAoRolar } from "./movimento";

export type Look = { titulo: string; pecas: Array<{ slug: string; nome: string; preco: string; foto: FotoGaleria }> };

const INTERVALO = 6000;

// "Complete o enxoval" no formato do "Curated outfits" (lululemon-pdp.md §1.6 item 9 e §6): metade
// esquerda escura com os títulos dos conjuntos em coluna (anterior e próximo esmaecidos, o atual
// inteiro), metade direita clara com a grade 2 × 2 das peças; embaixo, o botão de contorno e os
// controles (pausa e setas). Troca sozinho a cada 6 s (parado com movimento reduzido ou pausa).
// Celular: sem o painel escuro; título em 2 linhas, abas sublinhadas e a grade 2 × 2.
export function Looks({ looks, href }: { looks: Look[]; href: string }) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduzir, setReduzir] = useState(false);
  const total = looks.length;

  useEffect(() => setReduzir(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  useEffect(() => {
    if (pausado || reduzir || total < 2) return;
    const tempo = window.setTimeout(() => setAtual((indice) => (indice + 1) % total), INTERVALO);
    return () => window.clearTimeout(tempo);
  }, [atual, pausado, reduzir, total]);

  if (total === 0) return null;
  const look = looks[atual];

  return (
    <section id="complete-o-enxoval" aria-labelledby="titulo-looks" className={cx(secao, revelarAoRolar)}>
      <div className={painelEscuro}>
        <h2 id="titulo-looks" className={rotuloSecao}>
          Complete o enxoval
        </h2>
        <div className={janelaTitulos}>
          <ol aria-hidden className={titulos} style={{ transform: `translateY(${-44 - atual * 88}px)` }}>
          {looks.map((item, indice) => (
            <li key={item.titulo} data-distancia={Math.min(2, Math.abs(indice - atual))} className={tituloLook}>
              {item.titulo}
            </li>
          ))}
          </ol>
        </div>
      </div>

      <div className={painelClaro}>
        <h2 className={tituloCelular}>
          Complete
          <br />o enxoval
        </h2>
        <div role="tablist" aria-label="Conjuntos" className={abas}>
          {looks.map((item, indice) => (
            <button
              key={item.titulo}
              type="button"
              role="tab"
              aria-selected={indice === atual}
              aria-controls="grade-look"
              onClick={() => setAtual(indice)}
              className={aba}
            >
              {item.titulo}
            </button>
          ))}
        </div>
        <ul id="grade-look" role="tabpanel" aria-live="polite" aria-label={look.titulo} className={grade}>
          {look.pecas.slice(0, 4).map((peca) => (
            <li key={peca.slug} className={cx("group", css({ position: "relative" }))}>
              <FotoSlide foto={peca.foto} sizes="(min-width: 992px) 22vw, 50vw" className={css({ aspectRatio: "[5 / 6]" })} />
              <p className={nomePeca}>
                <Link href={`/produto/${peca.slug}`} className={linkCobre}>
                  {peca.nome}
                </Link>
              </p>
              <p className={precoPeca}>{formatarPreco(peca.preco)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className={rodape}>
        <Link href={href} className={botaoSecundario}>
          Ver o enxoval completo
        </Link>
        <div className={controles}>
          {total > 1 && (
            <>
              <button type="button" onClick={() => setPausado((valor) => !valor)} aria-label={pausado ? "Retomar a troca automática" : "Pausar a troca automática"} className={redondo}>
                {pausado || reduzir ? <Play size={16} weight="fill" aria-hidden /> : <Pause size={16} weight="fill" aria-hidden />}
              </button>
              {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha */}
              <div role="group" aria-label="Trocar de conjunto" className={setas}>
                <button type="button" aria-label="Conjunto anterior" onClick={() => setAtual((atual - 1 + total) % total)}>
                  <ArrowLeft size={20} weight="light" aria-hidden />
                </button>
                <button type="button" aria-label="Próximo conjunto" onClick={() => setAtual((atual + 1) % total)}>
                  <ArrowRight size={20} weight="light" aria-hidden />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const secao = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "repeat(2, minmax(0, 1fr))" },
  my: { base: "16", desktop: "24" },
  scrollMarginTop: "20",
});

const painelEscuro = css({
  display: { base: "none", desktop: "flex" },
  flexDirection: "column",
  overflow: "hidden",
  minH: "[640px]",
  px: "10",
  pt: "10",
  bg: "escuro",
  color: "fundo",
});

const rotuloSecao = css({ fontSize: "sm", fontWeight: "medium", color: "textoSobreEscuro" });

// Janela dos títulos: o atual fica no meio, o anterior em cima e o próximo embaixo.
const janelaTitulos = css({ position: "relative", flex: "1", overflow: "hidden" });

const titulos = css({
  position: "absolute",
  top: "[50%]",
  insetX: "0",
  display: "flex",
  flexDirection: "column",
  transition: "transform",
  transitionDuration: "gaveta",
  transitionTimingFunction: "assinatura",
});

const tituloLook = css({
  h: "[88px]",
  flexShrink: "0",
  fontSize: "secao",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  opacity: "[0.15]",
  transitionProperty: "opacity",
  transitionDuration: "gaveta",
  "&[data-distancia='0']": { opacity: "1" },
  "&[data-distancia='1']": { opacity: "[0.35]" },
});

const painelClaro = css({ bg: { base: "fundo", desktop: "fundoProduto" }, px: { base: "3", md: "5", desktop: "10" }, py: { desktop: "10" }, alignContent: "center" });

const tituloCelular = css({ display: { desktop: "none" }, fontSize: "blocoTablet", fontWeight: "normal", lineHeight: "bloco", letterSpacing: "bloco", color: "escuro" });

const abas = css({
  display: { base: "flex", desktop: "none" },
  gap: "6",
  mt: "6",
  mb: "6",
  overflowX: "auto",
  scrollbarWidth: "none",
  borderBottomWidth: "1px",
  borderColor: "borda",
});

const aba = css({
  flexShrink: "0",
  pb: "3",
  mb: "[-1px]",
  fontSize: "sm",
  color: "textoSuave",
  borderBottomWidth: "2px",
  borderColor: "transparent",
  cursor: "pointer",
  "&[aria-selected=true]": { color: "escuro", borderColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const grade = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { base: "3", desktop: "4" } });

const nomePeca = css({ mt: "2", fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro", lineClamp: "2" });
const precoPeca = css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" });

const linkCobre = css({
  _after: { content: '""', position: "absolute", inset: "0" },
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "[4px]" },
  _focusVisible: { outline: "none", _after: { boxShadow: "anelFoco" } },
});

const rodape = css({
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  px: { base: "3", md: "5", desktop: "6" },
  pt: "6",
});

const controles = css({ display: { base: "none", desktop: "flex" }, alignItems: "center", gap: "3" });

const redondo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const setas = css({
  display: "inline-flex",
  alignItems: "center",
  p: "1",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  color: "escuro",
  "& > button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    w: "8",
    h: "8",
    borderRadius: "pilula",
    cursor: "pointer",
    _hover: { bg: "superficieSuave" },
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
});
