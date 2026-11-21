"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Tamanho real de um elemento, em pixels: para desenhar em SVG sem esticar (recorte do funil, gráfico de linha). */
export function useTamanho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  useLayoutEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    const medir = () => setTamanho((atual) => { const largura = alvo.clientWidth, altura = alvo.clientHeight; return atual.largura === largura && atual.altura === altura ? atual : { largura, altura }; });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);
  return [ref, tamanho] as const;
}
