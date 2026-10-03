import { css, keyframes } from "@emotion/react";

/**
 * Animações de entrada do sistema. Usam `backwards` (e não `both`): depois de
 * entrar, o elemento volta aos próprios estilos (hover com transform etc.).
 * "Reduzir animações" (Acessibilidade ou sistema) desliga tudo pelo CSS global.
 */

export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export const rise = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const shimmer = keyframes`
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
`;

/** Entrada de um item (sobe e aparece). */
export const enter = (duration = 360) => css`
  animation: ${rise} ${duration}ms ${EASE_OUT} backwards;
`;

/** Atraso em cascata para o item `index` (limitado para listas longas). */
export const staggerDelay = (index: number, step = 28, max = 12) => `${Math.min(index, max) * step}ms`;

/** Filhos diretos entrando em cascata (cartões, seções, linhas). */
export const staggerChildren = (count = 12, step = 40, selector = "& > *") => css`
  ${selector} {
    animation: ${rise} 380ms ${EASE_OUT} backwards;
  }

  ${Array.from({ length: count }, (_, index) => `${selector}:nth-child(${index + 1}) { animation-delay: ${index * step}ms; }`).join("\n")}
`;
