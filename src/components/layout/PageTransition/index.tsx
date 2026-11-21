"use client";

import { ViewTransition, type ReactNode } from "react";
import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { EASE_OUT, rise } from "@/styles/animations";

/**
 * Envolve cada página (via `template.tsx`, que remonta a cada navegação) e faz a troca de uma tela para a outra
 * ser contínua: a que sai esmaece enquanto a nova surge por cima, subindo de leve (View Transitions do navegador,
 * pelo <ViewTransition> do React). O header fica parado, só o conteúdo troca. Navegador sem suporte: a entrada
 * suave de sempre. Mantém a coluna flex do painel para telas "cheias".
 */
const Root = styled("div", transientOptions)<{ $fill: boolean }>`
  ${({ $fill }) =>
    $fill
      ? `
        display: flex;
        flex: 1 0 auto;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      `
      : ""}

  @supports not (view-transition-name: none) {
    animation: ${rise} 320ms ${EASE_OUT} backwards;
  }
`;

// As classes abaixo são as que o <ViewTransition> põe na tela que sai (exit) e na que entra (enter).
const transicao = css`
  @keyframes pagina-sai {
    to { opacity: 0; transform: translateY(-3px); }
  }
  @keyframes pagina-entra {
    from { opacity: 0; transform: translateY(8px); }
  }
  ::view-transition-old(.pagina-sai) {
    animation: pagina-sai 160ms cubic-bezier(0.4, 0, 1, 1) both;
  }
  ::view-transition-new(.pagina-entra) {
    animation: pagina-entra 420ms cubic-bezier(0.22, 1, 0.36, 1) 70ms both;
  }
  /* O resto da tela (header, menu) não pisca durante a troca */
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(.pagina-sai),
    ::view-transition-new(.pagina-entra) {
      animation: none;
    }
  }
`;

export function PageTransition({ children, fill = true }: { children: ReactNode; fill?: boolean }) {
  return (
    <>
      <Global styles={transicao} />
      <ViewTransition enter="pagina-entra" exit="pagina-sai" update="none" default="none">
        <Root $fill={fill}>{children}</Root>
      </ViewTransition>
    </>
  );
}
