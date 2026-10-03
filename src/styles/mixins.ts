import { css, type Theme } from "@emotion/react";

/**
 * Padrão visual único dos controles (Button, IconButton, abas, itens de
 * menu). Mude aqui e todos acompanham. Sem sombra: só borda e fundo.
 */

export type ControlVariant = "primary" | "secondary" | "ghost" | "danger";

export const controlBase = (theme: Theme) => css`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: ${theme.radii.md};
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color ${theme.transitions.fast},
    border-color ${theme.transitions.fast},
    color ${theme.transitions.fast},
    box-shadow ${theme.transitions.fast};

  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    pointer-events: none;
  }
`;

export const controlVariant = (theme: Theme, variant: ControlVariant) => {
  const { colors, palette } = theme;

  switch (variant) {
    case "primary":
      return css`
        background-color: ${colors.primary.main};
        border-color: ${colors.primary.main};
        color: ${colors.primary.contrast};

        &:hover {
          background-color: ${colors.primary.hover};
          border-color: ${colors.primary.hover};
        }

        &:active {
          background-color: ${colors.primary.strong};
          border-color: ${colors.primary.strong};
        }
      `;
    case "secondary":
      return css`
        background-color: ${palette.neutral[0]};
        border-color: ${colors.border.subtle};
        color: ${colors.text.primary};

        &:hover {
          background-color: ${palette.neutral[25]};
          border-color: ${colors.border.default};
        }

        &:active {
          background-color: ${palette.neutral[50]};
        }
      `;
    case "ghost":
      return css`
        background-color: transparent;
        color: ${colors.text.secondary};

        &:hover {
          background-color: ${colors.interactive.hover};
          color: ${colors.text.primary};
        }

        &:active {
          background-color: ${colors.interactive.pressed};
        }
      `;
    case "danger":
      return css`
        background-color: ${colors.danger};
        border-color: ${colors.danger};
        color: ${colors.text.inverse};

        &:hover {
          background-color: #a8391f;
          border-color: #a8391f;
        }
      `;
  }
};

/** Estado selecionado/ativo: "cartão" branco discreto sobre o fundo. */
export const controlSelected = (theme: Theme) => css`
  background-color: ${theme.palette.neutral[0]};
  border-color: ${theme.colors.border.subtle};
  color: ${theme.colors.text.primary};

  &:hover {
    background-color: ${theme.palette.neutral[0]};
    color: ${theme.colors.text.primary};
  }
`;
