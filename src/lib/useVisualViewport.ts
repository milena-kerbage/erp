"use client";

import { useEffect } from "react";
import { MOBILE_QUERY } from "./useMediaQuery";

/** Mantém o chat e as folhas acima do teclado virtual, inclusive no Safari. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const compact = window.matchMedia(MOBILE_QUERY);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // O zoom manual deve continuar ampliando a página, sem reorganizá-la.
        if (!compact.matches || Math.abs(viewport.scale - 1) > 0.05) {
          root.style.removeProperty("--app-height");
          root.style.removeProperty("--keyboard-inset");
          return;
        }
        root.style.setProperty("--app-height", `${viewport.height}px`);
        root.style.setProperty("--keyboard-inset", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    compact.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      compact.removeEventListener("change", update);
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);
}
