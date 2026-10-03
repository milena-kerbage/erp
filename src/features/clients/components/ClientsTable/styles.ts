import { css, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { DOCK_SPACE } from "@/styles/sheet";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { staggerChildren } from "@/styles/animations";
import type { Tone } from "@/styles/theme";

/** Largura da coluna da caixa de seleção (a do cliente gruda logo depois). */
export const CHECK_WIDTH = "2.75rem";

/** Fundos opacos (as colunas fixas precisam cobrir o que rola por baixo). */
const rowHover = (theme: Theme) =>
  `color-mix(in srgb, ${theme.palette.neutral[900]} 3.5%, ${theme.colors.background.surface})`;
const rowSelected = (theme: Theme) =>
  `color-mix(in srgb, ${theme.palette.sage[500]} 9%, ${theme.colors.background.surface})`;

/* ---------- Estrutura ---------- */

/** Toolbar, tabela (rola nos dois sentidos) e rodapé; painel de ponta a ponta. */
export const Root = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
`;

export const Toolbar = styled.div`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(4, 5, 3)};

  ${({ theme }) => theme.media.md} {
    padding: calc(${({ theme }) => theme.spacing(3)} + env(safe-area-inset-top)) ${({ theme }) => theme.spacing(4)}
      ${({ theme }) => theme.spacing(2)};
  }
`;

export const SelectionInfo = styled.span`
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const TableScroll = styled.div`
  flex: 1;
  min-height: 0;
  /* Folga entre a barra de rolagem e a borda do painel */
  margin-right: 4px;
  overflow: auto;

  &::-webkit-scrollbar-track {
    margin-block: 10px;
  }

  &[data-scrolled] [data-edge] {
    box-shadow: inset -1px 0 0 ${({ theme }) => theme.colors.border.subtle};
  }

  /* Celular: rola até embaixo da tela; a última linha sobe acima do dock */
  ${({ theme }) => theme.media.md} {
    margin-right: 0;
    padding-bottom: ${DOCK_SPACE};
  }
`;

export const Footer = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 2.5rem;
  padding: ${({ theme }) => theme.spacing(0, 5)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.faint};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  /* No celular o rodapé ficaria embaixo do dock */
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/* ---------- Tabela ---------- */

export const Table = styled.table`
  ${staggerChildren(16, 22, "& tbody tr")};
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;
`;

/** Colunas fixas à esquerda: seleção e cliente. */
type Sticky = "check" | "name" | undefined;

const stickyStyles = (sticky: Sticky) =>
  sticky
    ? css`
        position: sticky;
        left: ${sticky === "check" ? 0 : CHECK_WIDTH};
        z-index: 1;
      `
    : "";

export const Th = styled("th", transientOptions)<{ $sticky?: Sticky; $align?: "left" | "right" }>`
  position: sticky;
  top: 0;
  z-index: 2;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: ${({ $align = "left" }) => $align};
  white-space: nowrap;

  ${({ $sticky }) => stickyStyles($sticky)};
  ${({ $sticky }) => ($sticky ? "z-index: 3;" : "")}

  &:first-of-type {
    width: ${CHECK_WIDTH};
    padding: ${({ theme }) => theme.spacing(0, 2, 0, 5)};
  }

  &:last-of-type {
    padding-right: ${({ theme }) => theme.spacing(5)};
  }

  /* Divisória vertical entre as colunas (menos depois da seleção e da última) */
  &:not(:first-of-type):not(:last-of-type) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.faint};
  }
`;

export const SortButton = styled("button", transientOptions)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 -4px;
  padding: 2px 4px;
  border-radius: ${({ theme }) => theme.radii.xs};
  font: inherit;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : "inherit")};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  }
`;

/** Contagem no título da coluna ("Cliente (14)"). */
export const HeadCount = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
`;

export const Tr = styled("tr", transientOptions)<{ $selected: boolean }>`
  cursor: pointer;

  td {
    background-color: ${({ theme, $selected }) => ($selected ? rowSelected(theme) : theme.colors.background.surface)};
  }

  &:hover td {
    background-color: ${({ theme, $selected }) => ($selected ? rowSelected(theme) : rowHover(theme))};
  }
`;

export const Td = styled("td", transientOptions)<{ $sticky?: Sticky; $align?: "left" | "right"; $muted?: boolean }>`
  height: 2.5rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
  color: ${({ theme, $muted }) => ($muted ? theme.colors.text.secondary : theme.colors.text.primary)};
  text-align: ${({ $align = "left" }) => $align};
  white-space: nowrap;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  ${({ $sticky }) => stickyStyles($sticky)};

  &:first-of-type {
    width: ${CHECK_WIDTH};
    padding: ${({ theme }) => theme.spacing(0, 2, 0, 5)};
  }

  &:last-of-type {
    padding-right: ${({ theme }) => theme.spacing(5)};
  }

  /* Divisória vertical entre as colunas (menos depois da seleção e da última) */
  &:not(:first-of-type):not(:last-of-type) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.faint};
  }
`;

/* ---------- Conteúdo das células ---------- */

/** Ícone + texto na mesma linha. */
export const Inline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  vertical-align: middle;

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const NameLink = styled(Link)`
  overflow: hidden;
  max-width: 13rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  text-overflow: ellipsis;

  &:hover {
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.colors.border.strong};
    text-underline-offset: 3px;
  }
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Selo tingido (etapa, origem). */
export const Pill = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1.75)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  vertical-align: middle;

  svg {
    flex-shrink: 0;
  }
`;

export const Tags = styled.span`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing(1)};
  vertical-align: middle;
`;

export const Budget = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

/* ---------- Cards ---------- */

export const CardGrid = styled.div`
  ${staggerChildren(16, 25)};
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(1, 5, 5)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.spacing(2)};
    padding: ${({ theme }) => theme.spacing(1, 4, 0)};
  }
`;

export const ClientCardRoot = styled("article", transientOptions)<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
  padding: ${({ theme }) => theme.spacing(3.5)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.palette.sage[400] : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme, $selected }) => ($selected ? rowSelected(theme) : theme.palette.neutral[0])};
  font-size: 0.8125rem;
  cursor: pointer;
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $selected }) => ($selected ? theme.palette.sage[400] : theme.colors.border.default)};
    transform: translateY(-1px);
  }
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};

  > input {
    align-self: flex-start;
  }
`;

export const CardName = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  > span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

export const CardLine = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 1.625rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing(2.5)};
  border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};
`;

export const EmptyRow = styled.td`
  padding: ${({ theme }) => theme.spacing(12, 5)};
`;
