"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowLeft, ArrowRight } from "@/loja/componentes/icones";
import { grupoSetasContorno, trilhoSnap } from "./estilos";

// Trilho horizontal com scroll-snap e o grupo de setas com contorno embaixo, à direita
// (lululemon-referencia.md §3.7): seta sem destino fica oculta; arrastar usa a rolagem nativa.
// Cada clique avança uma "página" de cards inteiros. Os itens são <li>.
export function Carrossel({
  rotulo,
  children,
  classeTrilho,
  classeSetas,
}: {
  rotulo: string;
  children: ReactNode;
  classeTrilho?: string;
  classeSetas?: string; // posição do grupo de setas (margens do módulo)
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const [noInicio, setNoInicio] = useState(true);
  const [noFim, setNoFim] = useState(false);

  const medir = useCallback(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    setNoInicio(elemento.scrollLeft <= 2);
    setNoFim(elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [medir]);

  function mover(direcao: 1 | -1) {
    const elemento = trilho.current;
    const primeiro = elemento?.firstElementChild as HTMLElement | null;
    if (!elemento || !primeiro) return;
    const segundo = primeiro.nextElementSibling as HTMLElement | null;
    const passo = segundo ? segundo.offsetLeft - primeiro.offsetLeft : primeiro.offsetWidth;
    const cabem = Math.max(1, Math.floor((elemento.clientWidth + 1) / passo));
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollBy({ left: direcao * cabem * passo, behavior: reduzir ? "auto" : "smooth" });
  }

  return (
    <div>
      <ul ref={trilho} aria-label={rotulo} onScroll={medir} className={cx(trilhoSnap, classeTrilho)}>
        {children}
      </ul>
      <div className={classeSetas}>
        {/* biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha */}
        <div role="group" aria-label={`Navegar em ${rotulo}`} className={css({ display: "flex", justifyContent: "flex-end", pt: "8" })}>
          <div className={grupoSetasContorno}>
            <button type="button" aria-label="Anteriores" disabled={noInicio} onClick={() => mover(-1)}>
              <ArrowLeft size={24} weight="light" aria-hidden />
            </button>
            <button type="button" aria-label="Próximos" disabled={noFim} onClick={() => mover(1)}>
              <ArrowRight size={24} weight="light" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
