"use client";

import Link from "next/link";
import { type CSSProperties, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight } from "@/loja/componentes/icones";
import { BotaoPausa } from "./BotaoPausa";
import type { Slide } from "./conteudo";
import { botaoTerciario, grupoSetasEscuro, scrim, subtitulo, tituloHero, trilhoSnap } from "./estilos";
import { Midia } from "./Midia";

const VIDEO = /\.(mp4|webm)$/i;
const DURACAO_TROCA = 900; // ms, com desaceleração (referência §3.3)

// Hero em tela cheia: trilho com scroll-snap, altura de 100vh (no celular, menos o cabeçalho de 56 px,
// que fica em fluxo), mídia cover com scrim inferior e texto no canto inferior esquerdo. Título revelado letra a letra, subtítulo e botões sobem em seguida.
// Sem troca automática: setas (grupo escuro) e arraste. Controles no canto inferior direito.
export function Hero({ slides }: { slides: Slide[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const animando = useRef(false);
  const [ativo, setAtivo] = useState(0);
  const temVideo = slides.some((slide) => slide.midia.src && VIDEO.test(slide.midia.src));

  function aoRolar() {
    const elemento = trilho.current;
    if (!elemento || animando.current) return;
    setAtivo(Math.round(elemento.scrollLeft / elemento.clientWidth));
  }

  function ir(destino: number) {
    const elemento = trilho.current;
    if (!elemento || destino < 0 || destino >= slides.length) return;
    setAtivo(destino);
    const inicio = elemento.scrollLeft;
    const fim = destino * elemento.clientWidth;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elemento.scrollLeft = fim;
      return;
    }
    // Rolagem própria de ~900 ms (o "smooth" do navegador é curto demais); o snap volta no fim.
    animando.current = true;
    elemento.style.scrollSnapType = "none";
    const comeco = performance.now();
    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - comeco) / DURACAO_TROCA);
      const curva = 1 - (1 - progresso) ** 3;
      elemento.scrollLeft = inicio + (fim - inicio) * curva;
      if (progresso < 1) requestAnimationFrame(passo);
      else {
        elemento.style.scrollSnapType = "";
        animando.current = false;
      }
    };
    requestAnimationFrame(passo);
  }

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques do ateliê" data-midia-grupo className={hero}>
      <div ref={trilho} onScroll={aoRolar} className={cx(trilhoSnap, css({ h: "full" }))}>
        {slides.map((slide, indice) => {
          const atual = indice === ativo;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${indice + 1} de ${slides.length}: ${slide.titulo}`}
              aria-hidden={!atual}
              inert={!atual}
              data-ativo={atual || undefined}
              className={slideEstilo}
            >
              <div className={midiaSlide}>
                <Midia {...slide.midia} iconeNoAlto preload={indice === 0} className={css({ w: "full", h: "full" })} />
              </div>
              <div className={scrim} />
              <div className={textoSlide}>
                <h2 aria-label={slide.titulo} className={cx(tituloHero, css({ color: "superficie", maxW: "[600px]" }))}>
                  <Letras texto={slide.titulo} />
                </h2>
                <p className={cx(subtitulo, entradaSubtitulo, css({ mt: "3", maxW: "[600px]", color: "superficie" }))}>{slide.subtitulo}</p>
                <div className={recorteAcoes}>
                  <div className={acoes}>
                    {slide.acoes.map((acao) => (
                      <Link key={acao.href} href={acao.href} className={botaoTerciario}>
                        {acao.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className={css({ srOnly: true })}>
        Slide {ativo + 1} de {slides.length}: {slides[ativo]?.titulo}
      </p>

      <div className={controles}>
        {temVideo && <BotaoPausa />}
        <div className={grupoSetasEscuro}>
          <button type="button" aria-label="Slide anterior" disabled={ativo === 0} onClick={() => ir(ativo - 1)}>
            <ArrowLeft size={24} weight="light" aria-hidden />
          </button>
          <button type="button" aria-label="Próximo slide" disabled={ativo === slides.length - 1} onClick={() => ir(ativo + 1)}>
            <ArrowRight size={24} weight="light" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

// Cada letra num <span> dentro de um contêiner recortado (por palavra, para não quebrar no meio):
// sobe de 100% com fade em 750 ms, a partir de 700 ms, com 20 ms entre letras.
function Letras({ texto }: { texto: string }) {
  let posicao = 0;
  const palavras = texto.split(" ");
  return (
    <span aria-hidden>
      {palavras.map((palavra, indicePalavra) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: palavras repetidas no título; a ordem é fixa
        <span key={indicePalavra}>
          <span className={palavraEstilo}>
            {[...palavra].map((letra, indiceLetra) => {
              const estilo: CSSProperties = { animationDelay: `${700 + posicao++ * 20}ms` };
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: letras repetidas; a ordem é fixa
                <span key={indiceLetra} className={letraEstilo} style={estilo}>
                  {letra}
                </span>
              );
            })}
          </span>
          {indicePalavra < palavras.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}

// Celular: 100vh menos o cabeçalho (56, em fluxo). Desktop: 100vh inteiro; o hero sobe os 64 px
// reservados para a pílula (ela flutua por cima).
const hero = css({
  position: "relative",
  isolation: "isolate",
  w: "full",
  h: { base: "[calc(100svh - token(sizes.cabecalhoCelular))]", desktop: "[100svh]" },
  mt: { desktop: "[calc(-1 * token(sizes.topoCabecalho))]" },
  bg: "escuro",
  overflow: "hidden",
});

const slideEstilo = css({ position: "relative", w: "full", minW: "full", h: "full", overflow: "hidden" });

// A mídia tem a altura da tela inteira, presa no alto (o pé fica cortado, como na referência).
const midiaSlide = css({
  position: "absolute",
  top: "0",
  left: "0",
  right: "0",
  h: "[100svh]",
  "[data-ativo] > &": { animation: "assentarSlide", _motionReduce: { animation: "[none]" } },
});

const textoSlide = css({
  position: "absolute",
  left: "0",
  right: "0",
  bottom: "0",
  zIndex: "[1]",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "3", md: "5", desktop: "10" },
  pb: { base: "[104px]", md: "5", desktop: "10" },
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "[180ms]",
  transitionTimingFunction: "out",
  "[data-ativo] > &": { opacity: "1" },
});

const palavraEstilo = css({ display: "inline-flex", overflow: "clip", verticalAlign: "bottom" });

const letraEstilo = css({
  display: "inline-block",
  "[data-ativo] &": { animation: "revelarLetra", _motionReduce: { animation: "[none]" } },
});

const entradaSubtitulo = css({
  "[data-ativo] &": { animation: "subirSuave", animationDelay: "[1.2s]", _motionReduce: { animation: "[none]" } },
});

// Os botões sobem de dentro de um recorte (125% → 0, 1 s, a partir de 1 s). Margem de recorte para
// o anel de foco não ser cortado.
const recorteAcoes = css({ mt: "12", overflow: "clip", overflowClipMargin: "[8px]" });

const acoes = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: { md: "center", desktop: "flex-start" },
  gap: "4",
  "[data-ativo] &": { animation: "subirBotoes", animationDelay: "[1s]", _motionReduce: { animation: "[none]" } },
});

const controles = css({
  position: "absolute",
  zIndex: "[2]",
  right: { base: "3", md: "5", desktop: "10" },
  bottom: { base: "3", md: "5", desktop: "10" },
  display: "flex",
  alignItems: "center",
  gap: "2",
  animation: "subirSuave",
  animationDelay: "[0.6s]",
  _motionReduce: { animation: "[none]" },
});
