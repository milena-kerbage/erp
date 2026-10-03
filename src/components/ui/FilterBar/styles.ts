import styled from "@emotion/styled";
import { rowStyles } from "@/components/ui/Popover/styles";
import { transientOptions } from "@/lib/emotion/transient";
import { fadeIn } from "@/styles/animations";

/* ---------- Barra ---------- */

export const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
`;

/** Busca larga: ocupa o espaço que sobra na linha. */
export const Search = styled.label`
  display: flex;
  flex: 1 1 16rem;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 14rem;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5, 0, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: text;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  /* Em foco só a borda muda (sem anel), como nos demais campos */
  &:focus-within {
    border-color: ${({ theme }) => theme.palette.sage[400]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* O atalho some enquanto se digita */
  &:focus-within kbd {
    opacity: 0;
  }

  svg {
    flex-shrink: 0;
  }

  /* Celular: a busca divide a linha com o botão de filtros */
  ${({ theme }) => theme.media.md} {
    flex: 1 1 0;
    min-width: 0;

    kbd {
      display: none;
    }

    input {
      font-size: 0.9375rem;
    }
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

export const Kbd = styled.kbd`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 1.375rem;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme }) => theme.colors.interactive.hover};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: opacity ${({ theme }) => theme.transitions.fast};
`;

export const Clear = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text.muted};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/** Botão quadrado ao lado da busca (filtros, ordenação). */
export const SquareButton = styled("button", transientOptions)<{ $active?: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 2.25rem;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.border.strong : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.interactive.hover : "transparent")};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &[aria-expanded="true"] {
    border-color: ${({ theme }) => theme.colors.border.default};
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const ActiveCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: ${({ theme }) => theme.spacing(0, 1)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.palette.neutral[0]};
`;

/* ---------- Filtros ativos ---------- */

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;

  /* Celular: os filtros ativos vão para a linha de baixo e rolam para o lado */
  ${({ theme }) => theme.media.md} {
    flex: 1 0 100%;
    flex-wrap: nowrap;
    order: 3;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }

    > * {
      flex-shrink: 0;
    }
  }
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1, 0, 2.5)};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  animation: ${fadeIn} 180ms ease-out;

  small {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text.muted};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/* ---------- Menu de filtros ---------- */

export const MenuSearch = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 2.75rem;
  /* Atravessa o recuo da superfície e cola no topo */
  margin: ${({ theme }) => theme.spacing(-1.5, -1.5, 1)};
  padding: ${({ theme }) => theme.spacing(0, 4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.muted};

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  ${({ theme }) => theme.media.md} {
    margin: ${({ theme }) => theme.spacing(0, -2, 1)};
    padding: ${({ theme }) => theme.spacing(0, 4)};

    input {
      font-size: 0.9375rem;
    }
  }
`;

export const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  /* Folga para a barra de rolagem não colar na borda */
  margin-right: -2px;
  padding-right: 2px;
  overflow-y: auto;
  /* Os divisores de ponta a ponta vazam alguns px: sem isso a lista rolava para o lado */
  overflow-x: hidden;

  &::-webkit-scrollbar-track {
    margin-block: 6px;
  }
`;

export const MenuRow = styled("div", transientOptions)<{ $active: boolean }>`
  ${({ theme }) => rowStyles(theme)};
  min-height: 2.375rem;
  background-color: ${({ theme, $active }) => ($active ? theme.colors.interactive.hover : "transparent")};

  > svg:first-of-type,
  > [data-leading] {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

export const RowCount = styled.span`
  flex-shrink: 0;
  margin-left: auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const Check = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  justify-content: flex-end;
  width: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const MenuEmpty = styled.div`
  padding: ${({ theme }) => theme.spacing(6, 3)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;
