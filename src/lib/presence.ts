"use client";

import { useEffect, useState } from "react";

/** Quanto dura a saída de folhas, janelas e dropdowns (a animação cabe nisso). */
export const EXIT_DURATION = 240;

/**
 * Mantém algo na tela um instante depois de fechar, para a saída animar em vez
 * de sumir de uma vez. `present`: deve ser desenhado; `closing`: está saindo
 * (marque com `data-closing` para o CSS animar). Com "reduzir movimento", sai
 * na hora.
 */
export function usePresence(open: boolean, duration = EXIT_DURATION) {
  const [mounted, setMounted] = useState(open);
  // Abriu: já entra desenhado neste mesmo render
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setMounted(false), reduce ? 0 : duration);
    return () => window.clearTimeout(timer);
  }, [open, mounted, duration]);

  return { present: open || mounted, closing: !open && mounted };
}
