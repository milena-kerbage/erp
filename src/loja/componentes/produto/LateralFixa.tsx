"use client";

import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";

const ALTURA_CABECALHO = 96; // barra utilitária + barra principal (tokens barraUtilitaria + cabecalho)
const FOLGA = 24;

// Painel de compra fixo como o "sticky sidebar" da Adidas: se cabe na tela, gruda logo abaixo do
// cabeçalho; se é mais alto que a tela, rola junto até o fim e gruda pela base, para que nada fique
// escondido. No celular vira "display: contents" e as partes entram na ordem da página.
export function LateralFixa({ children }: { children: ReactNode }) {
  const lateral = useRef<HTMLElement>(null);
  const topo = useTopoFixo(lateral);

  return (
    <aside ref={lateral} aria-label="Compra" className={estilo} style={{ top: topo }}>
      {children}
    </aside>
  );
}

// Topo do `position: sticky`: `desejado` (logo abaixo do cabeçalho) se o elemento cabe na tela;
// senão, menor ou negativo, para ele grudar pela base. Também usado nos resumos do carrinho e do checkout.
export function useTopoFixo(alvo: RefObject<HTMLElement | null>, desejado = ALTURA_CABECALHO): number {
  const [topo, setTopo] = useState(desejado);

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;
    const medir = () => setTopo(Math.min(desejado, window.innerHeight - elemento.offsetHeight - FOLGA));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [alvo, desejado]);

  return topo;
}

const estilo = css({
  display: { base: "contents", lg: "block" },
  gridArea: { lg: "lateral" },
  alignSelf: "start",
  position: { lg: "sticky" },
  px: { lg: "8" },
  pt: { lg: "6" },
  pb: { lg: "10" },
});
