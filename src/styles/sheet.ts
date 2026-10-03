import { css, keyframes, type Theme } from "@emotion/react";
import { EASE_OUT } from "./animations";

/**
 * Folha que sobe de baixo (celular): é assim que abrem dropdowns, janelas, a
 * busca e o menu. O dock flutuante fica por cima, então o conteúdo reserva o
 * espaço dele no fim.
 */

export const sheetUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: none; }
`;

/** Folha saindo: desce de volta (compõe com o `translate` do arrasto). */
export const sheetDown = keyframes`
  from { transform: none; }
  to { transform: translateY(100%); }
`;

/** Fundo escurecido saindo. */
export const fadeAway = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** Curva das saídas (a mesma das trocas do dock). */
export const EXIT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Folha saindo (use em `&[data-closing]`, no celular). */
export const sheetExit = css`
  animation: ${sheetDown} 240ms ${EXIT_EASE} forwards;
  pointer-events: none;
`;

/** Fundo escurecido saindo (use em `&[data-closing]`). */
export const backdropExit = css`
  animation: ${fadeAway} 240ms ease-out forwards;
  pointer-events: none;
`;

/** Espaço do dock no fim de folhas e páginas. */
export const DOCK_SPACE = "calc(5.75rem + env(safe-area-inset-bottom))";

/** Do fim da tela até 8px acima do dock (compositor do chat encostado nele). */
export const DOCK_CLEARANCE = "calc(4.625rem + env(safe-area-inset-bottom))";

/** Cantos de cima arredondados, sem borda embaixo, alça no topo e entrada de baixo. */
export const sheetStyles = (theme: Theme) => css`
  /* Só rola na vertical: arrastar para o lado não mexe a folha */
  overflow-x: hidden;
  touch-action: pan-y;
  border-bottom: 0;
  border-radius: 1.25rem 1.25rem 0 0;
  animation: ${sheetUp} 380ms ${EASE_OUT};

  &::before {
    content: "";
    position: absolute;
    top: 0.5rem;
    left: 50%;
    width: 2.25rem;
    height: 4px;
    margin-left: -1.125rem;
    border-radius: 2px;
    background-color: ${theme.palette.neutral[300]};
  }
`;
