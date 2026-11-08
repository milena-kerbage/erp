"use client";

import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { Carrossel } from "./Carrossel";

// Faixa rolável usada fora da home (vitrines da área Projetos). Mesma API de antes; agora com o
// trilho e o grupo de setas com contorno da home (lululemon-referencia.md §3.7).
// "abaixo": setas embaixo à direita. "lateral": idem, mas só a partir do desktop (no celular arrasta).
export function Trilha({
  rotulo,
  setas,
  className,
  children,
}: {
  rotulo: string;
  setas: "lateral" | "abaixo";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Carrossel rotulo={rotulo} classeTrilho={className} classeSetas={setas === "lateral" ? css({ display: { base: "none", desktop: "block" } }) : undefined}>
      {children}
    </Carrossel>
  );
}
