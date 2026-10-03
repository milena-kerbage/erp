"use client";

import { useSyncExternalStore } from "react";

/** Mesmo corte do `theme.media.md`: celular. */
export const MOBILE_QUERY = "(max-width: 768px)";

/**
 * A media query casa agora? No servidor devolve `false` (primeira tela de
 * desktop), então use só para decidir comportamento (ex.: arrastar ou não);
 * o visual de cada tamanho fica no CSS.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
