"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Icon } from "@phosphor-icons/react";

/**
 * Paginador que uma tela coloca no dock do celular (ex.: etapas do kanban:
 * "‹ 2/5 ›"). Só um por vez; some quando a tela sai.
 */
/** Curva das trocas do dock (largura, botões que deslizam e os que entram). */
export const DOCK_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type DockPager = {
  current: number;
  total: number;
  /** Nome do que está à vista (leitor de tela e título). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
};

let pager: DockPager | null = null;
const listeners = new Set<() => void>();

function set(next: DockPager | null) {
  pager = next;
  listeners.forEach((listener) => listener());
}

export function useDockPager() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pager,
    () => null,
  );
}

/** Registra o paginador enquanto a tela estiver montada (null tira). */
export function useDockPagerRegistration(value: DockPager | null) {
  useEffect(() => {
    set(value);
    return () => {
      if (pager === value) set(null);
    };
  }, [value]);
}

/* ---------- Ações da tela ---------- */

/** Um botão que a tela coloca no dock (ex.: anexar, enviar, avançar etapa). */
export type DockAction = {
  id: string;
  label: string;
  icon: Icon;
  onClick: () => void;
  /** Ação principal: botão escuro (com texto, se houver). */
  primary?: boolean;
  /** Texto ao lado do ícone (só na principal, quando cabe). */
  text?: string;
  disabled?: boolean;
  /** Cor do ícone (ex.: verde do WhatsApp). */
  color?: string;
};

export type DockActions = {
  items: DockAction[];
  /** "Fechar" da tela (ex.: sair da conversa); sem ele, o ✕ não aparece. */
  onClose?: () => void;
  closeLabel?: string;
};

type ActionsEntry = { id: number; value: DockActions };

let actionsStack: ActionsEntry[] = [];
let actionsSequence = 0;
const actionsListeners = new Set<() => void>();
const emitActions = () => actionsListeners.forEach((listener) => listener());
const getActions = () => actionsStack[actionsStack.length - 1]?.value ?? null;

/** As ações da tela de cima (a última que registrou), ou null. */
export function useDockActions() {
  return useSyncExternalStore(
    (listener) => {
      actionsListeners.add(listener);
      return () => actionsListeners.delete(listener);
    },
    getActions,
    () => null,
  );
}

/** Coloca ações no dock enquanto `value` não for null (a mais recente fica por cima). */
export function useDockActionsRegistration(value: DockActions | null) {
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    if (!value) return;
    const id = idRef.current ?? ++actionsSequence;
    idRef.current = id;
    const index = actionsStack.findIndex((entry) => entry.id === id);
    actionsStack =
      index >= 0
        ? actionsStack.map((entry) => (entry.id === id ? { id, value } : entry))
        : [...actionsStack, { id, value }];
    emitActions();
  }, [value]);

  // Sai da pilha só quando deixa de registrar (ou a tela sai)
  const active = value !== null;
  useEffect(() => {
    if (!active) return;
    return () => {
      actionsStack = actionsStack.filter((entry) => entry.id !== idRef.current);
      idRef.current = null;
      emitActions();
    };
  }, [active]);
}
