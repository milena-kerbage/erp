"use client";

import { type ReactNode, useRef } from "react";
import { css } from "styled-system/css";
import { useTopoFixo } from "@/loja/componentes/produto/LateralFixa";

// Painel de orçamento fixo da página do projeto: o mesmo comportamento do painel de compra da PDP
// (LateralFixa): gruda abaixo do cabeçalho se cabe na tela; se é mais alto, rola junto e gruda
// pela base. No celular vira "display: contents" e as partes entram na ordem da grade.
export function LateralProjeto({ children }: { children: ReactNode }) {
  const lateral = useRef<HTMLElement>(null);
  const topo = useTopoFixo(lateral);
  return (
    <aside ref={lateral} aria-label="Orçamento" className={estilo} style={{ top: topo }}>
      {children}
    </aside>
  );
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
