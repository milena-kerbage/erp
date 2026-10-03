import styled from "@emotion/styled";
import { css, type Theme } from "@emotion/react";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { controlBase, controlSelected, controlVariant } from "@/styles/mixins";

type Expandable = { $expanded: boolean };

/**
 * Dois visuais:
 * - recolhida: trilho de círculos (brancos nos módulos, contorno no rodapé);
 * - expandida: lista discreta com o item ativo como "cartão" branco.
 */
export const ITEM_SIZE = { collapsed: "2.75rem", expanded: "2.5rem" } as const;

/** Coluna abaixo do header, sem fundo próprio. */
export const Aside = styled("aside", transientOptions)<Expandable>`
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  width: ${({ theme, $expanded }) =>
    $expanded ? theme.layout.sidebarExpanded : theme.layout.sidebarCollapsed};
  min-height: 0;
  padding: ${({ theme, $expanded }) =>
    $expanded ? theme.spacing(0, 4, 3) : theme.spacing(0, 3.5, 3)};
  transition:
    width ${({ theme }) => theme.transitions.normal},
    padding ${({ theme }) => theme.transitions.normal};

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Centraliza os módulos na altura disponível; rola se não couberem. */
export const Nav = styled.nav`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  > ul {
    /* margin auto centraliza sem cortar o topo quando há overflow */
    margin-block: auto;
  }

  /* Espaço para o foco não ser cortado pelo scroll */
  margin: ${({ theme }) => theme.spacing(-1)};
  padding: ${({ theme }) => theme.spacing(1)};
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const List = styled("ul", transientOptions)<Expandable>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $expanded }) => ($expanded ? theme.spacing(1) : theme.spacing(1.5))};
`;

export const Footer = styled("div", transientOptions)<Expandable>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $expanded }) => ($expanded ? theme.spacing(1) : theme.spacing(1.5))};
  margin-top: ${({ theme }) => theme.spacing(3)};
  padding-top: ${({ theme }) => theme.spacing(3)};
  border-top: 1px solid
    ${({ theme, $expanded }) => ($expanded ? theme.colors.border.subtle : "transparent")};
`;

export type ItemTone = "surface" | "outline";

type ItemStyleProps = Expandable & { $active: boolean; $tone: ItemTone };

/** Círculo do trilho recolhido. */
const collapsedStyles = (theme: Theme, tone: ItemTone, active: boolean) => {
  if (active) {
    return css`
      background-color: ${theme.colors.primary.main};
      border-color: ${theme.colors.primary.main};
      color: ${theme.colors.primary.contrast};

      &:hover {
        background-color: ${theme.colors.primary.hover};
        border-color: ${theme.colors.primary.hover};
      }
    `;
  }

  return tone === "surface"
    ? css`
        background-color: ${theme.palette.neutral[0]};
        border-color: transparent;
        color: ${theme.colors.text.secondary};

        &:hover {
          border-color: ${theme.colors.border.subtle};
          color: ${theme.colors.text.primary};
        }
      `
    : css`
        background-color: transparent;
        border-color: ${theme.colors.border.default};
        color: ${theme.colors.text.secondary};

        &:hover {
          background-color: ${theme.palette.neutral[0]};
          color: ${theme.colors.text.primary};
        }
      `;
};

export const itemStyles = ({
  theme,
  $active,
  $expanded,
  $tone,
}: ItemStyleProps & { theme: Theme }) => css`
  ${controlBase(theme)};
  ${$expanded ? controlVariant(theme, "ghost") : collapsedStyles(theme, $tone, $active)};
  ${$expanded && $active && controlSelected(theme)};
  justify-content: flex-start;
  width: 100%;
  height: ${$expanded ? ITEM_SIZE.expanded : ITEM_SIZE.collapsed};
  border-radius: ${$expanded ? theme.radii.md : theme.radii.full};
  overflow: hidden;
  text-align: left;
  transition:
    background-color ${theme.transitions.fast},
    border-color ${theme.transitions.fast},
    color ${theme.transitions.fast},
    height ${theme.transitions.normal},
    border-radius ${theme.transitions.normal};
`;

export const ItemLink = styled(Link, transientOptions)<ItemStyleProps>`
  ${itemStyles}
`;

export const ItemButton = styled("button", transientOptions)<ItemStyleProps>`
  ${itemStyles}
`;

/** Área quadrada do ícone: é o círculo visível com a sidebar recolhida. */
export const IconBox = styled("span", transientOptions)<Expandable & { $active?: boolean }>`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  /* Compensa a borda do item para o ícone ficar centralizado */
  width: ${({ $expanded }) => ($expanded ? ITEM_SIZE.expanded : ITEM_SIZE.collapsed)};
  height: ${({ $expanded }) => ($expanded ? ITEM_SIZE.expanded : ITEM_SIZE.collapsed)};
  margin: -1px;
  color: ${({ theme, $active, $expanded }) =>
    $active && $expanded ? theme.colors.primary.main : "inherit"};
  transition:
    width ${({ theme }) => theme.transitions.normal},
    height ${({ theme }) => theme.transitions.normal};
`;

export const IndicatorSlot = styled.span`
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
`;

/** Selo "Produção" dos módulos bloqueados (só com a sidebar expandida). */
export const SoonSlot = styled("span", transientOptions)<Expandable>`
  display: inline-flex;
  flex-shrink: 0;
  margin-left: auto;
  padding-right: ${({ theme }) => theme.spacing(2)};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
  transition-delay: ${({ $expanded }) => ($expanded ? "80ms" : "0ms")};
`;

/** Cadeado no canto do círculo (sidebar recolhida). */
export const LockSlot = styled.span`
  position: absolute;
  right: 0.3rem;
  bottom: 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: 1.5px solid ${({ theme }) => theme.palette.neutral[0]};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.tones.peach.soft};
  color: ${({ theme }) => theme.tones.peach.fg};
`;

export const Label = styled("span", transientOptions)<Expandable & { $active?: boolean }>`
  min-width: 0;
  overflow: hidden;
  padding-right: ${({ theme }) => theme.spacing(3)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.medium};
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
  transition-delay: ${({ $expanded }) => ($expanded ? "80ms" : "0ms")};
`;
