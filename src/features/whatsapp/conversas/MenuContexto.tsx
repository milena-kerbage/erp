"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MenuFlutuante } from "./estilos";

export type Opcao = { rotulo: string; icone?: ReactNode; aoEscolher: () => void; perigo?: boolean } | "separador";

/** Menu no ponto do clique (botão direito / toque longo), como o ContextMenu da Le Ange. Esc ou clique fora fecha. */
export function MenuContexto({ x, y, opcoes, topo, aoFechar }: { x: number; y: number; opcoes: Opcao[]; topo?: ReactNode; aoFechar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const caixa = ref.current?.getBoundingClientRect();
    if (!caixa) return;
    setPosicao({ left: Math.max(8, Math.min(x, window.innerWidth - caixa.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - caixa.height - 8)) });
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [x, y]);
  useEffect(() => {
    const fora = (e: Event) => { if (!ref.current?.contains(e.target as Node)) aoFechar(); };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); aoFechar(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const botoes = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])], atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
        botoes[(atual + (e.key === "ArrowDown" ? 1 : -1) + botoes.length) % botoes.length]?.focus();
      }
    };
    window.addEventListener("pointerdown", fora, true);
    window.addEventListener("keydown", tecla, true);
    window.addEventListener("resize", aoFechar);
    window.addEventListener("scroll", aoFechar, true);
    return () => { window.removeEventListener("pointerdown", fora, true); window.removeEventListener("keydown", tecla, true); window.removeEventListener("resize", aoFechar); window.removeEventListener("scroll", aoFechar, true); };
  }, [aoFechar]);
  return createPortal(
    <MenuFlutuante ref={ref} role="menu" style={posicao}>
      {topo}
      {opcoes.map((opcao, i) => opcao === "separador" ? <hr key={i} /> : (
        <button key={opcao.rotulo} type="button" role="menuitem" data-perigo={opcao.perigo || undefined} onClick={() => { aoFechar(); opcao.aoEscolher(); }}>{opcao.icone}{opcao.rotulo}</button>
      ))}
    </MenuFlutuante>,
    document.body,
  );
}
