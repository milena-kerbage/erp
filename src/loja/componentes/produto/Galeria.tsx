"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight, ArrowsOut, BabyCarriage } from "@/loja/componentes/icones";
import { controleClaro } from "@/loja/componentes/inicio/estilos";
import type { FotoGaleria } from "./dados";
import { FotoSlide } from "./FotoSlide";
import { Visualizador } from "./Visualizador";

// Galeria da página de produto (lululemon-pdp.md §1.2 e §6): carrossel horizontal de fotos 5:6 com
// snap, sem barra de rolagem. No desktop ocupa as DUAS colunas da área acima da dobra e fica sticky a
// 80 px: o painel de compra (440) passa por cima dela. Cada slide tem 43,25% da largura (519 em 1200) e
// uma divisória clara de 2 px à direita. Controles no canto inferior direito da área visível (24 da
// borda do painel e da base): "Complete o enxoval" (redondo de 40, vidro) e as setas em pílula de vidro
// (72 × 40). Celular: slide de 100% sem setas, "expandir" no canto superior direito, "Complete o
// enxoval" no inferior direito e a barra de progresso de 1 px (segmento 1/N) colada na base.
// Clique na foto abre o visualizador em tela cheia.
// Movimento (lululemon-animacoes-edicao.md §1): as fotos entram com fade ao abrir o produto (e a foto
// real, de novo, quando carrega); a troca de slide é rolagem suave com snap; a barra de progresso
// acompanha a rolagem continuamente (posição = scrollLeft / máximo), sem esperar o snap.
export function Galeria({ nome, fotos, temComplementos }: { nome: string; fotos: FotoGaleria[]; temComplementos: boolean }) {
  const trilho = useRef<HTMLUListElement>(null);
  const barra = useRef<HTMLSpanElement>(null);
  const [atual, setAtual] = useState(0);
  const [noInicio, setNoInicio] = useState(true);
  const [noFim, setNoFim] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);
  const total = fotos.length;

  const medir = useCallback(() => {
    const elemento = trilho.current;
    const primeiro = elemento?.firstElementChild as HTMLElement | null;
    if (!elemento || !primeiro) return;
    // Progresso contínuo: o segmento (1/N) desliza de 0 a N−1 larguras conforme a rolagem.
    const maximo = elemento.scrollWidth - elemento.clientWidth;
    barra.current?.style.setProperty("--posicao", String(maximo > 0 ? (elemento.scrollLeft / maximo) * (total - 1) : 0));
    setNoInicio(elemento.scrollLeft <= 2);
    setNoFim(elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 2);
    setAtual(Math.min(total - 1, Math.round(elemento.scrollLeft / primeiro.offsetWidth)));
  }, [total]);

  useEffect(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [medir]);

  function irPara(indice: number) {
    const elemento = trilho.current;
    const alvo = elemento?.children[indice] as HTMLElement | undefined;
    if (!elemento || !alvo) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollTo({ left: alvo.offsetLeft, behavior: reduzir ? "auto" : "smooth" });
  }

  return (
    <section aria-label={`Fotos de ${nome}`} className={secao}>
      <a href="#painel-compra" className={pular}>
        Pular galeria
      </a>
      <div className={moldura}>
        <ul ref={trilho} onScroll={medir} className={trilhoGaleria}>
          {fotos.map((foto, indice) => (
            <li key={`${foto.tom}-${indice}`} className={slide}>
              <button
                type="button"
                onClick={() => setAberto(indice)}
                aria-label={`Abrir a foto ${indice + 1} de ${total} em tela cheia`}
                className={botaoFoto}
              >
                <FotoSlide
                  foto={foto}
                  tingir
                  sizes="(min-width: 992px) 44vw, (min-width: 768px) 50vw, 100vw"
                  preload={indice === 0}
                  className={quadro}
                />
              </button>
            </li>
          ))}
        </ul>

        {/* Celular e tablet: expandir (abre o visualizador) no canto superior direito. */}
        <button type="button" onClick={() => setAberto(atual)} aria-label="Ver fotos em tela cheia" className={cx(controleClaro, expandir)}>
          <ArrowsOut size={20} aria-hidden />
        </button>

        <div className={controles}>
          {temComplementos && (
            <a href="#complete-o-enxoval" aria-label="Complete o enxoval: ver as peças que combinam" className={cx(controleClaro, completar)}>
              <BabyCarriage size={22} weight="light" aria-hidden />
            </a>
          )}
          {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha */}
          <div role="group" aria-label="Navegar nas fotos" className={setas}>
            <button type="button" aria-label="Foto anterior" disabled={noInicio} onClick={() => irPara(Math.max(0, atual - 1))}>
              <ArrowLeft size={20} aria-hidden />
            </button>
            <button type="button" aria-label="Próxima foto" disabled={noFim} onClick={() => irPara(Math.min(total - 1, atual + 1))}>
              <ArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>

        <div aria-hidden className={progresso}>
          <span ref={barra} className={segmento} style={{ width: `${100 / total}%` }} />
        </div>
      </div>

      <Visualizador
        fotos={fotos}
        inicial={aberto}
        aoFechar={(indice) => {
          setAberto(null);
          irPara(indice);
        }}
      />
    </section>
  );
}

// Desktop: ocupa as duas colunas (o painel fica por cima, na 2ª). Celular e tablet: 1ª linha, mas se
// estende à linha do painel para continuar sticky enquanto o painel sobe por cima.
const secao = css({
  position: "relative",
  gridColumn: "1 / -1",
  gridRow: { base: "1 / 3", desktop: "1" },
  minW: "0",
});

const pular = css({
  position: "absolute",
  top: "0",
  left: "3",
  zIndex: "[3]",
  w: "[1px]",
  h: "[1px]",
  overflow: "hidden",
  opacity: "0",
  _focus: { w: "auto", h: "auto", px: "4", py: "3", opacity: "1", bg: "superficie", fontSize: "sm", fontWeight: "medium", boxShadow: "anelFoco" },
});

const moldura = css({ position: "sticky", top: { base: "0", desktop: "20" } });

const trilhoGaleria = css({
  display: "flex",
  overflowX: "auto",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  overscrollBehaviorX: "contain",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  // Desktop: a última foto precisa caber à esquerda do painel.
  pr: { desktop: "[token(sizes.painelCompra)]" },
  scrollPaddingRight: { desktop: "[token(sizes.painelCompra)]" },
});

const slide = css({
  position: "relative",
  flex: "none",
  // No desktop o trilho tem recuo de 440 à direita: 43,25% da largura TOTAL (519 em 1200).
  w: { base: "full", md: "[50%]", desktop: "[calc((100% + token(sizes.painelCompra)) * 0.4325)]" },
  scrollSnapAlign: "start",
  _last: { scrollSnapAlign: { base: "start", desktop: "end" } },
  // Divisória clara de 2 px entre as fotos.
  _before: { content: '""', position: "absolute", top: "0", bottom: "0", right: "0", zIndex: "[1]", w: "[2px]", bg: "fundoSutil" },
});

const botaoFoto = css({
  display: "block",
  animation: "aparecerFoto",
  w: "full",
  cursor: "zoom-in",
  _focusVisible: { outline: "none", boxShadow: "[inset 0 0 0 3px token(colors.foco)]" },
});

const quadro = css({ w: "full", aspectRatio: "[5 / 6]" });

const expandir = css({ position: "absolute", top: "3", right: "3", zIndex: "[2]", display: { desktop: "none" } });

const controles = css({
  position: "absolute",
  zIndex: "[2]",
  bottom: { base: "3", md: "6" },
  right: { base: "3", md: "6", desktop: "[calc(token(sizes.painelCompra) + 24px)]" },
  display: "flex",
  alignItems: "center",
  gap: "4",
});

const completar = css({ transitionProperty: "opacity, background-color", transitionDuration: "controle" });

// Setas em pílula de vidro: 72 × 40, 2 botões de 32 (cantos externos redondos); só a partir do tablet.
const setas = css({
  display: { base: "none", md: "inline-flex" },
  alignItems: "center",
  p: "1",
  borderRadius: "pilula",
  bg: "controleClaro",
  backdropFilter: "auto",
  backdropBlur: "botao",
  color: "escuro",
  "& > button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    w: "8",
    h: "8",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "normal",
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
  "& > button:first-child": { borderRadius: "[1000px 0 0 1000px]" },
  "& > button:last-child": { borderRadius: "[0 1000px 1000px 0]" },
  "& > button:not(:disabled):hover": { bg: "superficie" },
  "& > button:disabled": { color: "desabilitado", cursor: "default" },
});

// Barra de 1 px colada na base (celular e tablet): trilho claro e segmento escuro de 1/N, instantâneo.
const progresso = css({ display: { base: "block", desktop: "none" }, h: "[1px]", bg: "placeholder", overflow: "hidden" });
const segmento = css({ display: "block", h: "full", bg: "escuro", transform: "translateX(calc(var(--posicao, 0) * 100%))" });
