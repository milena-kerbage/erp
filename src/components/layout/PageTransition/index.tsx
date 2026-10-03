"use client";

import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { EASE_OUT, rise } from "@/styles/animations";

/**
 * Envolve cada página (via `template.tsx`, que remonta a cada navegação) com
 * uma entrada suave. Mantém a coluna flex do painel para telas "cheias".
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
  animation: ${rise} 320ms ${EASE_OUT} backwards;
`;

export function PageTransition({ children, fill = true }: { children: ReactNode; fill?: boolean }) {
  return <Root $fill={fill}>{children}</Root>;
}
