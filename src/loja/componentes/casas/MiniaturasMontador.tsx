"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";
import { ArrowLeft, ArrowRight } from "@/loja/componentes/icones";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { FotoGaleria } from "@/loja/componentes/produto/dados";
import { Visualizador } from "@/loja/componentes/produto/Visualizador";
import { formatarPreco } from "@/loja/lib/casas/catalogo";
import type { IconeModulo } from "@/loja/lib/casas/modulos";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { FotoProjeto } from "./FotoProjeto";

// Miniaturas das peças escolhidas no resumo lateral do montador: carrossel MANUAL numa linha só
// (trilho com rolagem horizontal e snap, sem barra visível; toque arrasta nativamente e o mouse
// arrasta pelo próprio trilho), com setas pequenas no desktop quando há mais peças do que cabem. As
// miniaturas ficam coladas, separadas só por uma divisória de 1 px, de cantos retos como as grades
// da loja. Sem animação contínua e sem repetir itens. Cada miniatura abre o visualizador em tela
// cheia da página de produto (Visualizador), com as peças escolhidas em sequência: mesmas medidas,
// setas, miniaturas, Esc e zoom.

export type MiniaturaPeca = {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  icone: IconeModulo;
  paleta?: string[];
  foto?: Foto; // foto da peça do catálogo, quando a cliente trocou o módulo por ela
};

const LIMIAR_ARRASTO = 6; // px: abaixo disso é clique, acima é arrasto (o clique é ignorado)

export function MiniaturasMontador({ pecas }: { pecas: MiniaturaPeca[] }) {
  const trilho = useRef<HTMLUListElement>(null);
  const arrasto = useRef<{ x: number; inicio: number; moveu: boolean } | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  const [limites, setLimites] = useState({ inicio: true, fim: true });

  const medir = useCallback(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    setLimites({ inicio: elemento.scrollLeft <= 1, fim: elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 1 });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mede de novo quando a quantidade de peças muda
  useEffect(() => {
    medir();
    const elemento = trilho.current;
    if (!elemento) return;
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [medir, pecas.length]);

  function rolar(sentido: 1 | -1) {
    const elemento = trilho.current;
    if (!elemento) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollBy({ left: sentido * elemento.clientWidth * 0.8, behavior: reduzir ? "auto" : "smooth" });
  }

  // Arrastar com o mouse (o toque já rola nativamente).
  function pressionar(evento: PointerEvent<HTMLUListElement>) {
    if (evento.pointerType !== "mouse" || !trilho.current) return;
    arrasto.current = { x: evento.clientX, inicio: trilho.current.scrollLeft, moveu: false };
  }

  function mover(evento: PointerEvent<HTMLUListElement>) {
    const estado = arrasto.current;
    const elemento = trilho.current;
    if (!estado || !elemento) return;
    const delta = evento.clientX - estado.x;
    if (!estado.moveu && Math.abs(delta) < LIMIAR_ARRASTO) return;
    if (!estado.moveu) {
      estado.moveu = true;
      elemento.dataset.arrastando = "";
      elemento.setPointerCapture(evento.pointerId);
    }
    elemento.scrollLeft = estado.inicio - delta;
  }

  function soltar() {
    const elemento = trilho.current;
    if (elemento) delete elemento.dataset.arrastando;
    // O clique que encerra um arrasto não abre o visualizador (zerado no próximo quadro).
    window.requestAnimationFrame(() => {
      arrasto.current = null;
    });
  }

  if (pecas.length === 0) return null;

  const fotos: FotoGaleria[] = pecas.map((peca) => ({ alt: peca.nome, tom: "linho", icone: "berco", principal: false }));
  const legendas = pecas.map((peca) => `${peca.nome} · ${peca.detalhe} · a partir de ${formatarPreco(peca.preco)}`);
  const comSetas = !(limites.inicio && limites.fim);

  return (
    <div className={css({ position: "relative", mt: "3" })}>
      <ul
        ref={trilho}
        aria-label="Peças escolhidas: abra uma para ver em tela cheia"
        onScroll={medir}
        onPointerDown={pressionar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        className={trilhoEstilo}
      >
        {pecas.map((peca, indice) => (
          <li key={peca.id} className={itemFaixa}>
            <button
              type="button"
              aria-label={`Ver ${peca.nome} em tela cheia`}
              title={peca.nome}
              onClick={() => {
                if (arrasto.current?.moveu) return;
                setAberta(indice);
              }}
              className={botaoMiniatura}
            >
              <Desenho peca={peca} contexto="miniatura" />
            </button>
          </li>
        ))}
      </ul>

      {comSetas && (
        <div className={setas}>
          <button type="button" aria-label="Peças anteriores" disabled={limites.inicio} onClick={() => rolar(-1)}>
            <ArrowLeft size={14} aria-hidden />
          </button>
          <button type="button" aria-label="Próximas peças" disabled={limites.fim} onClick={() => rolar(1)}>
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      )}

      <Visualizador
        fotos={fotos}
        inicial={aberta}
        aoFechar={() => setAberta(null)}
        rotulo="Peças do seu quartinho em tela cheia"
        legendas={legendas}
        desenhar={(indice, contexto) => {
          const peca = pecas[indice];
          return peca ? <Desenho peca={peca} contexto={contexto} /> : null;
        }}
      />
    </div>
  );
}

// A peça: a foto do catálogo (next/image, carregada sob demanda), quando há, ou a composição nos tons
// da paleta com o ícone do módulo (só CSS, sem imagem).
function Desenho({ peca, contexto }: { peca: MiniaturaPeca; contexto: "tela" | "miniatura" }) {
  const sizes = contexto === "tela" ? "(min-width: 768px) 84vh, 100vw" : "56px";
  const classe = css({ w: "full", h: "full" });
  if (peca.foto) return <FotoProduto foto={peca.foto} sizes={sizes} className={classe} />;
  return <FotoProjeto paleta={peca.paleta} icone={peca.icone} bolinhas={contexto === "tela"} sizes={sizes} className={classe} />;
}

// Trilho manual: rolagem horizontal com snap, sem barra; as miniaturas coladas, com a divisória de
// 1 px como a das grades (fundo da borda aparecendo entre elas).
const trilhoEstilo = css({
  display: "flex",
  gap: "[1px]",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  bg: "borda",
  borderWidth: "1px",
  borderColor: "borda",
  touchAction: "pan-x pan-y",
  cursor: "grab",
  "&[data-arrastando]": { cursor: "grabbing", scrollSnapType: "none", "& button": { pointerEvents: "none" } },
});

const itemFaixa = css({ flex: "none", scrollSnapAlign: "start" });

const botaoMiniatura = css({
  display: "block",
  w: "14",
  aspectRatio: "[5 / 6]",
  overflow: "hidden",
  cursor: "zoom-in",
  bg: "fundoProduto",
  transitionProperty: "opacity",
  transitionDuration: "normal",
  _hover: { opacity: "[0.85]" },
  _focusVisible: { outline: "none", boxShadow: "[inset 0 0 0 2px token(colors.foco)]" },
});

// Setas pequenas, só no desktop (no toque, o trilho arrasta).
const setas = css({
  display: { base: "none", desktop: "flex" },
  justifyContent: "flex-end",
  gap: "1",
  mt: "2",
  "& > button": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    w: "7",
    h: "7",
    borderRadius: "pilula",
    borderWidth: "1px",
    borderColor: "borda",
    bg: "superficie",
    color: "escuro",
    cursor: "pointer",
    _hover: { borderColor: "escuro" },
    _disabled: { color: "desabilitado", cursor: "default", _hover: { borderColor: "borda" } },
    _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  },
});
