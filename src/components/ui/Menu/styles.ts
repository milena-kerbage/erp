import { css, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { rowStyles } from "@/components/ui/Popover/styles";

type ItemStyleProps = { $selected: boolean; $muted: boolean };

const itemStyles = ({ theme, $selected, $muted }: ItemStyleProps & { theme: Theme }) => css`
  ${rowStyles(theme)};
  font-weight: ${$selected ? theme.fontWeights.medium : theme.fontWeights.regular};
  color: ${$muted ? theme.colors.text.muted : theme.colors.text.primary};

  /* Hover move o foco (ver MenuItem): um único item destacado */
  &:focus {
    background-color: ${theme.colors.interactive.hover};
  }

  &:active {
    background-color: ${theme.colors.interactive.pressed};
  }
`;

export const ItemLink = styled(Link, transientOptions)<ItemStyleProps>`
  ${itemStyles}
`;

export const ItemButton = styled("button", transientOptions)<ItemStyleProps>`
  ${itemStyles}
`;

/** Bloco livre no topo do menu (ex.: dados do usuário). */
export const Header = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2, 2.5)};
`;

/** Texto informativo entre grupos. */
export const Note = styled.p`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(1.5, 2.5)};
  font-size: 0.8125rem;
  line-height: ${({ theme }) => theme.lineHeights.normal};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** "+" discreto no fim de um item (ex.: adicionar pessoa). */
export const AddHint = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.full};
  color: ${({ theme }) => theme.colors.text.secondary};
`;
