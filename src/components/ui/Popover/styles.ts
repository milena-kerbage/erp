import { css, keyframes, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { DOCK_SPACE, sheetExit, sheetStyles } from "@/styles/sheet";
import type { PopoverSide } from "./usePopover";

/**
 * Visual único dos dropdowns (Menu e Select): superfície branca, linhas com
 * recuo e cantos concêntricos, divisores de ponta a ponta.
 */

const INSET = 1.5; // spacing → 6px entre a borda e as linhas

const origin: Record<PopoverSide, string> = {
  top: "bottom left",
  right: "left bottom",
  bottom: "top left",
  left: "right bottom",
};

/** De onde o popover "nasce": sai do gatilho em direção ao lado em que abre. */
const from: Record<PopoverSide, string> = {
  top: "translateY(6px)",
  right: "translateX(-6px)",
  bottom: "translateY(-6px)",
  left: "translateX(6px)",
};

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

const enter = (side: PopoverSide) => keyframes`
  from {
    opacity: 0;
    transform: ${from[side]} scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
`;

const childEnter = (side: PopoverSide) => keyframes`
  from {
    opacity: 0;
    transform: ${from[side].replace("6px", "3px")};
  }
  to {
    opacity: 1;
    transform: none;
  }
`;

const exitSoft = keyframes`
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: scale(0.98); }
`;

/** Filhos entram em cascata, 18ms entre cada um. */
const stagger = Array.from(
  { length: 14 },
  (_, index) => `& > *:nth-child(${index + 1}) { animation-delay: ${30 + index * 18}ms; }`,
).join("\n");

export const Surface = styled("div", transientOptions)<{
  $side: PopoverSide;
  $width: string;
  $ready: boolean;
}>`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  display: flex;
  flex-direction: column;
  width: ${({ $width }) => $width};
  max-height: min(28rem, calc(var(--app-height, 100dvh) - 1rem));
  padding: ${({ theme }) => theme.spacing(INSET)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  visibility: ${({ $ready }) => ($ready ? "visible" : "hidden")};
  transform-origin: ${({ $side }) => origin[$side]};
  animation: ${({ $side }) => enter($side)} 220ms ${EASE_OUT};
  outline: none;

  & > * {
    animation: ${({ $side }) => childEnter($side)} 260ms ${EASE_OUT} both;
  }

  ${stagger}

  /* Saindo: some suave (no celular, desce) */
  &[data-closing] {
    animation: ${exitSoft} 150ms ease-in forwards;
    pointer-events: none;
  }

  /* Celular: folha que sobe de baixo, de ponta a ponta, com a tela escurecida atrás */
  ${({ theme }) => theme.media.md} {
    top: auto !important;
    right: 0 !important;
    bottom: var(--keyboard-inset, 0px) !important;
    left: 0 !important;
    width: auto !important;
    max-height: min(calc(var(--app-height, 100dvh) * 0.78), 42rem);
    /* Itens soltos rolam na própria folha; o fim passa por baixo do dock */
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: ${({ theme }) => theme.spacing(6, 2)} ${DOCK_SPACE};
    ${({ theme }) => sheetStyles(theme)};

    /* Com uma lista que rola por dentro, é ela que vai até embaixo (sem faixa reservada) */
    &:has(> [data-sheet-scroll]) {
      padding-bottom: 0;
    }

    > [data-sheet-scroll] {
      padding-bottom: ${DOCK_SPACE};
      overflow-x: hidden;
      overscroll-behavior: contain;
    }

    &[data-closing] {
      ${sheetExit};
    }
  }
`;

/** Linha de opção/ação (altura, recuo e estados). */
export const rowStyles = (theme: Theme) => css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${theme.spacing(2.5)};
  width: 100%;
  min-height: 2.5rem;
  padding: ${theme.spacing(0, 2.5)};
  border-radius: ${theme.radii.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.regular};
  color: ${theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: background-color ${theme.transitions.fast};

  &[aria-disabled="true"] {
    opacity: 0.45;
    cursor: default;
  }

  svg {
    flex-shrink: 0;
  }
`;

/** Ícone/elemento à esquerda da linha. */
export const RowLeading = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  align-self: stretch;
  justify-content: center;
  min-width: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};

  > svg {
    width: 18px;
    height: 18px;
  }
`;

export const RowLabel = styled.span`
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
`;

/** O rótulo tem prioridade: só é cortado se sozinho não couber. */
export const RowText = styled.span`
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/** Texto secundário ao lado do rótulo (ex.: "+55", "@usuario"); encolhe primeiro. */
export const RowMeta = styled.span`
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-overflow: ellipsis;
`;

/** Rótulo com explicação embaixo (opções que precisam ser bem descritas). */
export const RowStack = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing(1.5, 0)};
  white-space: normal;
`;

export const RowDescription = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const RowTrailing = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.primary};
`;

/** Divisor de ponta a ponta (atravessa o recuo). */
export const Separator = styled.div`
  flex-shrink: 0;
  height: 1px;
  margin: ${({ theme }) => theme.spacing(INSET, -INSET)};
  background-color: ${({ theme }) => theme.colors.border.subtle};
`;

/** Rótulo de um grupo de opções. */
export const GroupLabel = styled.div`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(1.5, 2.5, 1)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Contador discreto no fim de uma linha (ex.: "+8"). */
export const Count = styled.span`
  display: inline-flex;
  align-items: center;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;
