"use client";

import { type MouseEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight, Minus, Plus, X } from "@/loja/componentes/icones";
import { useDialogoAnimado } from "@/loja/componentes/layout/cabecalho/Gaveta";
import type { FotoGaleria } from "./dados";
import { FotoSlide } from "./FotoSlide";

// Visualizador em tela cheia (lululemon-pdp.md §1.5): <dialog> de 100vw × 100vh com fundo claro, sem
// véu. À esquerda, a coluna de miniaturas a 32 px da borda (ativa 68 × 81, demais 45 × 54, passo 66);
// as fotos ficam num trilho horizontal na altura total (5:6). Sobre as fotos o cursor do sistema dá
// lugar a um círculo com lupa (+) que segue o mouse; o clique amplia (2×) e o mouse passeia pela foto.
// Fechar redondo de 40 no canto superior direito, setas em pílula no inferior direito, Esc fecha e as
// setas do teclado navegam. No celular: uma foto por vez na largura toda, sem miniaturas.
// Abre e fecha com fade de 250 ms (lululemon-animacoes-edicao.md §1) pela base comum dos diálogos
// (useDialogoAnimado): a página atrás fica travada, o fechamento espera o fade e o foco volta à foto.
// Também serve ao montador ("Monte o seu quartinho"), com as peças escolhidas: `desenhar` troca a foto
// de cada quadro (e da miniatura) por outra composição, e `legendas` dá o nome de cada quadro (rótulos
// e a legenda no canto inferior esquerdo). As medidas e as interações são as mesmas.
export function Visualizador({
  fotos,
  inicial,
  aoFechar,
  rotulo = "Fotos em tela cheia",
  desenhar,
  legendas,
}: {
  fotos: FotoGaleria[];
  inicial: number | null; // índice a abrir; null = fechado
  aoFechar: (indice: number) => void;
  rotulo?: string;
  desenhar?: (indice: number, contexto: "tela" | "miniatura") => ReactNode;
  legendas?: string[];
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const lupa = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [origem, setOrigem] = useState("50% 50%");
  const [fechando, setFechando] = useState(false);
  const total = fotos.length;
  const atualRef = useRef(atual);
  atualRef.current = atual;

  const { dialogo, propsDialogo } = useDialogoAnimado({
    aberta: inicial !== null && !fechando,
    aoFechar: () => setFechando(true),
    aoFechado: () => {
      setFechando(false);
      setAmpliada(null);
      aoFechar(atualRef.current);
    },
    duracao: 250,
  });

  const irPara = useCallback((indice: number, suave = true) => {
    const elemento = trilho.current;
    const alvo = elemento?.children[indice] as HTMLElement | undefined;
    if (!elemento || !alvo) return;
    setAmpliada(null);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollTo({ left: alvo.offsetLeft, behavior: suave && !reduzir ? "smooth" : "auto" });
    setAtual(indice);
  }, []);

  // Ao abrir (o <dialog> já está aberto pela base), posiciona na foto clicada sem animar.
  useEffect(() => {
    if (inicial !== null) irPara(inicial, false);
  }, [inicial, irPara]);

  function fechar() {
    setFechando(true);
  }

  function aoRolar() {
    const elemento = trilho.current;
    const primeiro = elemento?.firstElementChild as HTMLElement | null;
    if (!elemento || !primeiro) return;
    const fim = elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 2;
    setAtual(fim ? total - 1 : Math.min(total - 1, Math.round(elemento.scrollLeft / primeiro.offsetWidth)));
  }

  // Cursor de lupa: segue o mouse (só mouse; no toque fica escondido) e, com a foto ampliada, a origem
  // do zoom acompanha o ponteiro.
  function mover(evento: PointerEvent<HTMLElement>, indice: number) {
    if (evento.pointerType !== "mouse") return;
    const circulo = lupa.current;
    if (circulo) {
      circulo.style.transform = `translate(${evento.clientX}px, ${evento.clientY}px)`;
      circulo.dataset.visivel = "";
    }
    if (ampliada === indice) {
      const caixa = evento.currentTarget.getBoundingClientRect();
      setOrigem(`${((evento.clientX - caixa.left) / caixa.width) * 100}% ${((evento.clientY - caixa.top) / caixa.height) * 100}%`);
    }
  }

  function esconderLupa() {
    if (lupa.current) delete lupa.current.dataset.visivel;
  }

  function alternarZoom(evento: MouseEvent<HTMLElement>, indice: number) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    setOrigem(`${((evento.clientX - caixa.left) / caixa.width) * 100}% ${((evento.clientY - caixa.top) / caixa.height) * 100}%`);
    setAmpliada((agora) => (agora === indice ? null : indice));
  }

  return (
    <dialog
      ref={dialogo}
      aria-label={rotulo}
      {...propsDialogo}
      onKeyDown={(evento) => {
        if (evento.key === "ArrowRight") irPara(Math.min(total - 1, atual + 1));
        if (evento.key === "ArrowLeft") irPara(Math.max(0, atual - 1));
      }}
      className={tela}
    >
      <ul ref={trilho} onScroll={aoRolar} className={trilhoTela}>
        {fotos.map((foto, indice) => (
          <li key={`${foto.tom}-${indice}`} className={item}>
            <button
              type="button"
              aria-label={
                ampliada === indice
                  ? `Reduzir ${legendas?.[indice] ?? `a foto ${indice + 1}`}`
                  : `Ampliar ${legendas?.[indice] ? `${legendas[indice]}, ${indice + 1} de ${total}` : `a foto ${indice + 1} de ${total}`}`
              }
              aria-pressed={ampliada === indice}
              onClick={(evento) => alternarZoom(evento, indice)}
              onPointerMove={(evento) => mover(evento, indice)}
              onPointerLeave={esconderLupa}
              className={botaoFoto}
            >
              <span className={cx(camadaZoom, ampliada === indice && ampliadaEstilo)} style={{ transformOrigin: origem }}>
                {desenhar ? desenhar(indice, "tela") : <FotoSlide foto={foto} sizes="(min-width: 768px) 84vh, 100vw" className={css({ w: "full", h: "full" })} />}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div ref={lupa} aria-hidden className={cursorLupa}>
        {ampliada === atual ? <Minus size={20} /> : <Plus size={20} />}
      </div>

      <ol aria-label="Miniaturas" className={miniaturas}>
        {fotos.map((foto, indice) => (
          <li key={`mini-${foto.tom}-${indice}`}>
            <button
              type="button"
              aria-label={`Ir para ${legendas?.[indice] ?? `a foto ${indice + 1}`}`}
              aria-current={indice === atual || undefined}
              onClick={() => irPara(indice)}
              className={miniatura}
            >
              {desenhar ? desenhar(indice, "miniatura") : <FotoSlide foto={foto} sizes="68px" className={css({ w: "full", h: "full" })} />}
            </button>
          </li>
        ))}
      </ol>

      <p aria-live="polite" className={contador}>
        {atual + 1} / {total}
      </p>

      {legendas?.[atual] && <p className={legenda}>{legendas[atual]}</p>}

      <button type="button" data-autofoco aria-label="Fechar fotos" onClick={fechar} className={botaoFechar}>
        <X size={16} aria-hidden />
      </button>

      {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha */}
      <div role="group" aria-label="Navegar nas fotos" className={setas}>
        <button type="button" aria-label="Foto anterior" disabled={atual === 0} onClick={() => irPara(atual - 1)}>
          <ArrowLeft size={20} aria-hidden />
        </button>
        <button type="button" aria-label="Próxima foto" disabled={atual === total - 1} onClick={() => irPara(atual + 1)}>
          <ArrowRight size={20} aria-hidden />
        </button>
      </div>
    </dialog>
  );
}

// Tela cheia (100% da viewport e 100dvh), com fade: o fundo é do próprio <dialog> (o ::backdrop fica
// transparente para não "piscar" ao fechar) e a opacidade vai de 0 a 1 em 250 ms.
const tela = css({
  position: "fixed",
  inset: "0",
  w: "full",
  h: "dvh",
  maxW: "none",
  maxH: "none",
  m: "0",
  p: "0",
  border: "none",
  bg: "fundoProduto",
  overflow: "clip", // nunca rola de lado (o foco inicial não desloca a tela)
  overscrollBehavior: "contain",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "aparecer",
  transitionTimingFunction: "saida",
  "&[data-estado=aberta]": { opacity: "1", transitionTimingFunction: "entrada" },
  "&::backdrop": { bg: "transparent" },
});

const trilhoTela = css({
  display: "flex",
  h: "full",
  overflowX: "auto",
  overscrollBehavior: "contain",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const item = css({
  flex: "none",
  w: { base: "[100vw]", md: "[calc(100dvh * 5 / 6)]" },
  h: "full",
  scrollSnapAlign: "start",
});

const botaoFoto = css({
  display: "block",
  position: "relative",
  w: "full",
  h: "full",
  overflow: "hidden",
  cursor: "zoom-in",
  "@media (hover: hover) and (pointer: fine)": { cursor: "none" },
  _focusVisible: { outline: "none", boxShadow: "[inset 0 0 0 3px token(colors.foco)]" },
});

const camadaZoom = css({
  display: "block",
  w: "full",
  h: "full",
  transition: "transform",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
});

const ampliadaEstilo = css({ transform: "scale(2)" });

// Círculo de 56 com + (ou −) que substitui o cursor sobre as fotos.
const cursorLupa = css({
  position: "fixed",
  top: "[-28px]",
  left: "[-28px]",
  zIndex: "[3]",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "14",
  h: "14",
  borderRadius: "pilula",
  bg: "controleClaro",
  backdropFilter: "auto",
  backdropBlur: "botao",
  color: "escuro",
  pointerEvents: "none",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "controle",
  "&[data-visivel]": { opacity: "1" },
  "@media (hover: none)": { display: "none" },
});

const miniaturas = css({
  position: "absolute",
  top: "[50%]",
  left: "8",
  transform: "translateY(-50%)",
  display: { base: "none", md: "flex" },
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "3",
  maxH: "[calc(100dvh - 64px)]",
  overflowY: "auto",
  scrollbarWidth: "none",
});

const miniatura = css({
  display: "block",
  w: "[45px]",
  h: "[54px]",
  overflow: "hidden",
  cursor: "pointer",
  opacity: "[0.7]",
  transitionProperty: "width, height, opacity",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  _hover: { opacity: "1" },
  "&[aria-current=true]": { w: "[68px]", h: "[81px]", opacity: "1", outline: "[1px solid token(colors.escuro)]" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const contador = css({
  position: "absolute",
  top: "8",
  left: { base: "4", md: "8" },
  display: { md: "none" },
  fontSize: "sm",
  color: "escuro",
});

// Nome do quadro atual (montador): no canto inferior esquerdo, na altura das setas.
const legenda = css({
  position: "absolute",
  left: { base: "4", md: "[calc(32px + 68px + 24px)]" },
  right: "[96px]",
  bottom: { base: "5", md: "9" },
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  truncate: true,
});

const botaoFechar = css({
  position: "absolute",
  top: { base: "4", md: "8" },
  right: { base: "4", md: "8" },
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  _hover: { bg: "superficie" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const setas = css({
  position: "absolute",
  right: { base: "4", md: "8" },
  bottom: { base: "4", md: "8" },
  display: "inline-flex",
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
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
  "& > button:first-child": { borderRadius: "[1000px 0 0 1000px]" },
  "& > button:last-child": { borderRadius: "[0 1000px 1000px 0]" },
  "& > button:not(:disabled):hover": { bg: "superficie" },
  "& > button:disabled": { color: "desabilitado", cursor: "default" },
});
