"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { DockAction } from "./dock";

/**
 * Pilha do que está aberto por cima da tela (dropdowns, janelas, busca e o
 * menu). No celular tudo isso vira uma folha que sobe de baixo, e o dock usa
 * esta pilha para trocar o botão por "fechar" e saber o que fechar.
 */

export type SheetKind = "menu" | "search" | "other";

type Entry = {
  id: number;
  kind: SheetKind;
  close: () => void;
  /** Ações da folha no dock (ex.: "Abrir oportunidade" da ficha do cliente). */
  actions?: DockAction[];
  /** Sem fundo próprio (dropdowns): o dock desenha um atrás, que segura o toque e fecha. */
  backdrop?: boolean;
};

let stack: Entry[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getTop = () => stack[stack.length - 1] ?? null;
const getServerTop = () => null;

/** O que está aberto por cima de tudo (ou null). */
export function useTopSheet() {
  return useSyncExternalStore(subscribe, getTop, getServerTop);
}

/**
 * Registra algo aberto enquanto `open` for verdadeiro. Com `actions`, o dock
 * mostra essas ações (mais o fechar) em vez de só o fechar.
 */
export function useSheet(
  open: boolean,
  close: () => void,
  kind: SheetKind = "other",
  actions?: DockAction[],
  backdrop = false,
) {
  const closeRef = useRef(close);
  const idRef = useRef<number | null>(null);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const entry: Entry = { id: ++sequence, kind, backdrop, close: () => closeRef.current() };
    idRef.current = entry.id;
    stack = [...stack, entry];
    emit();
    return () => {
      stack = stack.filter((item) => item.id !== entry.id);
      idRef.current = null;
      emit();
    };
  }, [open, kind, backdrop]);

  // Ações mudam sem reabrir a folha
  useEffect(() => {
    if (!open || idRef.current === null) return;
    stack = stack.map((item) => (item.id === idRef.current ? { ...item, actions } : item));
    emit();
  }, [open, actions]);
}

/** Atributo do dock: toques nele não contam como "clique fora" dos dropdowns. */
export const DOCK_ATTRIBUTE = "data-mobile-dock";

/** Fundo escurecido atrás dos dropdowns no celular: o toque nele só fecha (não passa para a página). */
export const SHEET_BACKDROP_ATTRIBUTE = "data-sheet-backdrop";
