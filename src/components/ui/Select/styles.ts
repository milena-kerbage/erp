import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { rowStyles } from "@/components/ui/Popover/styles";
import type { Tone } from "@/styles/theme";

/* ---------- Conteúdo do popover ---------- */

export const SearchRow = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 2.5rem;
  /* Atravessa o recuo da superfície e cola no topo */
  margin: ${({ theme }) => theme.spacing(-1.5, -1.5, 1.5)};
  padding: ${({ theme }) => theme.spacing(0, 4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.muted};
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

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow-y: auto;
  /* Divisores de ponta a ponta vazam alguns px: a lista nunca rola para o lado */
  overflow-x: hidden;
  outline: none;
`;

export const Option = styled("li", transientOptions)<{ $active: boolean; $selected: boolean }>`
  ${({ theme }) => rowStyles(theme)};
  /* Como no padrão dos dropdowns: fundo só no item em foco; o escolhido tem o check */
  background-color: ${({ theme, $active }) => ($active ? theme.colors.interactive.hover : "transparent")};
`;

/** Marcador da seleção múltipla: círculo vazio ou preenchido com check. */
export const Checkbox = styled("span", transientOptions)<{ $checked: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border: 1.5px solid
    ${({ theme, $checked }) => ($checked ? theme.colors.primary.strong : theme.colors.border.strong)};
  border-radius: 50%;
  background-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.primary.strong : theme.palette.neutral[0]};
  color: ${({ theme }) => theme.colors.primary.contrast};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};
`;

export const Empty = styled.li`
  padding: ${({ theme }) => theme.spacing(4, 3)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

/* ---------- Campo (gatilho padrão para formulários) ---------- */

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;
`;

export const FieldLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const FieldHint = styled.span`
  margin-left: ${({ theme }) => theme.spacing(1)};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const Required = styled.span`
  margin-left: 2px;
  color: ${({ theme }) => theme.colors.danger};
`;

export const Control = styled("div", transientOptions)<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0.5, 2, 0.5, 1.5)};
  border: 1px solid
    ${({ theme, $open }) => ($open ? theme.palette.sage[400] : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $open }) => ($open ? theme.palette.sage[400] : theme.colors.border.default)};
  }

  /* Em foco só a borda muda de cor (sem anel), como no TextField */
  &:focus-within {
    border-color: ${({ theme }) => theme.palette.sage[400]};
  }
`;

export const Chip = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  height: 1.625rem;
  padding: ${({ theme }) => theme.spacing(0, 1, 0, 2)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: ${({ theme }) => theme.radii.xs};
  color: inherit;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.06);
  }
`;

/** Parte clicável do campo: valor/placeholder + seta. */
export const TriggerButton = styled.button`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  min-height: 2rem;
  padding-left: ${({ theme }) => theme.spacing(1.5)};
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`;

export const Value = styled.span`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Placeholder = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const More = styled.span`
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const Caret = styled("span", transientOptions)<{ $open: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.muted};
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  transition: transform ${({ theme }) => theme.transitions.fast};
`;
