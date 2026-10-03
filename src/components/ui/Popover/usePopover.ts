"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import type { DockAction } from "@/lib/dock";
import { usePresence } from "@/lib/presence";
import { useSheetDrag } from "@/lib/sheetDrag";
import { DOCK_ATTRIBUTE, SHEET_BACKDROP_ATTRIBUTE, useSheet } from "@/lib/sheets";

export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "end";

export type PopoverPosition = { top: number; left: number; side: PopoverSide };

/** Props que o elemento gatilho precisa receber. */
export type PopoverTriggerProps = {
  ref: (element: HTMLElement | null) => void;
  id: string;
  "aria-haspopup": "menu" | "listbox" | "dialog";
  "aria-expanded": boolean;
  "aria-controls"?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

type Options = {
  side: PopoverSide;
  align: PopoverAlign;
  offset: number;
  role: "menu" | "listbox" | "dialog";
  /** Elemento usado para posicionar (padrão: o próprio gatilho). */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Celular: ações da folha no dock (ex.: "Limpar filtros"). */
  dockActions?: DockAction[];
};

const VIEWPORT_MARGIN = 8;

const OPPOSITE: Record<PopoverSide, PopoverSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Espaço livre entre o gatilho e a borda da tela em cada lado. */
function spaceOn(side: PopoverSide, trigger: DOMRect) {
  switch (side) {
    case "top":
      return trigger.top;
    case "bottom":
      return window.innerHeight - trigger.bottom;
    case "left":
      return trigger.left;
    case "right":
      return window.innerWidth - trigger.right;
  }
}

function computePosition(
  trigger: DOMRect,
  content: { width: number; height: number },
  preferredSide: PopoverSide,
  align: PopoverAlign,
  offset: number,
): PopoverPosition {
  // Inverte o lado quando não cabe e o lado oposto tem mais espaço.
  const vertical = preferredSide === "top" || preferredSide === "bottom";
  const needed = (vertical ? content.height : content.width) + offset + VIEWPORT_MARGIN;
  const side =
    spaceOn(preferredSide, trigger) < needed &&
    spaceOn(OPPOSITE[preferredSide], trigger) > spaceOn(preferredSide, trigger)
      ? OPPOSITE[preferredSide]
      : preferredSide;

  let top: number;
  let left: number;

  if (side === "top" || side === "bottom") {
    top = side === "bottom" ? trigger.bottom + offset : trigger.top - offset - content.height;
    left = align === "start" ? trigger.left : trigger.right - content.width;
  } else {
    left = side === "right" ? trigger.right + offset : trigger.left - offset - content.width;
    top = align === "start" ? trigger.top : trigger.bottom - content.height;
  }

  // Mantém dentro da tela.
  const maxTop = window.innerHeight - content.height - VIEWPORT_MARGIN;
  const maxLeft = window.innerWidth - content.width - VIEWPORT_MARGIN;

  return {
    side,
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop)),
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
  };
}

/**
 * Base dos dropdowns (Menu, Select): abre/fecha, posiciona junto ao gatilho
 * (invertendo o lado se faltar espaço), fecha com clique fora e ao navegar.
 */
export function usePopover({ side, align, offset, role, anchorRef, dockActions }: Options) {
  const id = useId();
  const contentId = `${id}-content`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /** O popover foi aberto pelo teclado (foca o primeiro item). */
  const viaKeyboardRef = useRef(false);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [triggerWidth, setTriggerWidth] = useState(0);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Fechou: fica na tela o tempo da saída (data-closing anima) e só então some
  const { present, closing } = usePresence(open);
  useLayoutEffect(() => {
    contentRef.current?.toggleAttribute("data-closing", closing);
  }, [closing, present]);
  useEffect(() => {
    if (!present) setPosition(null);
  }, [present]);

  const openPopover = useCallback((viaKeyboard: boolean) => {
    viaKeyboardRef.current = viaKeyboard;
    // Medido antes de abrir, para o conteúdo já nascer com a largura certa.
    setTriggerWidth(triggerRef.current?.offsetWidth ?? 0);
    setOpen(true);
  }, []);

  // Posiciona depois de medir o conteúdo.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const update = () => {
      const anchor = anchorRef?.current ?? triggerRef.current;
      if (!anchor || !contentRef.current) return;
      // offset* ignora o scale da animação de entrada
      const { offsetWidth: width, offsetHeight: height } = contentRef.current;
      setPosition(computePosition(anchor.getBoundingClientRect(), { width, height }, side, align, offset));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, side, align, offset, anchorRef]);

  // Clique fora fecha.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      // O dock do celular fecha pelo próprio botão (evita fechar e reabrir no mesmo toque)
      if (target instanceof Element && target.closest(`[${DOCK_ATTRIBUTE}]`)) return;
      // O fundo escurecido do celular fecha no próprio clique (sem o toque vazar para a página)
      if (target instanceof Element && target.closest(`[${SHEET_BACKDROP_ATTRIBUTE}]`)) return;
      close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // No celular vira folha de baixo: o dock mostra "fechar" (e as ações da folha),
  // desenha o fundo escurecido atrás e puxar a folha para baixo fecha
  useSheet(open, () => close(true), "other", dockActions, true);
  useSheetDrag(contentRef, () => close(true), open);

  // Fecha ao navegar.
  useEffect(() => {
    close();
  }, [pathname, close]);

  const triggerProps: PopoverTriggerProps = {
    ref: (element) => {
      triggerRef.current = element;
    },
    id: `${id}-trigger`,
    "aria-haspopup": role,
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    onClick: (event) => {
      if (open) close();
      // detail === 0: clique disparado pelo teclado (Enter/Espaço)
      else openPopover(event.detail === 0);
    },
    onKeyDown: (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openPopover(true);
      }
    },
  };

  return {
    id,
    contentId,
    // Desenhar o conteúdo: aberto ou ainda saindo
    open: present,
    closing,
    position,
    triggerWidth,
    triggerRef,
    contentRef,
    viaKeyboardRef,
    triggerProps,
    close,
  };
}
