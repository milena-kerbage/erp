"use client";

import { css, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { staggerChildren } from "@/styles/animations";

/*
 * A tabela do sistema. Um visual só para todas as telas (Leads e clientes, E-commerce, Configurações, Operações):
 * cabeçalho baixo em cinza, linhas de 2,5rem, divisória vertical entre as colunas e a linha sob o mouse realçada.
 *
 * - <TableCard> + <Table>: o caso comum, com <th>/<td> simples.
 * - <ResponsiveTable>: a mesma tabela que vira lista de cartões quando o espaço é curto (cada <td> mostra o título
 *   pelo data-label).
 * - headCell / bodyCell / columnDivider: as mesmas regras em pedaços, para a tabela de Leads e clientes, que tem
 *   colunas fixas e seleção e por isso monta as próprias células.
 */

/** Fundo opaco da linha sob o mouse (colunas fixas precisam cobrir o que rola por baixo). */
export const rowHover = (theme: Theme) => `color-mix(in srgb, ${theme.palette.neutral[900]} 3.5%, ${theme.colors.background.surface})`;

export const headCell = (theme: Theme) => css`
  height: 2.25rem;
  padding: ${theme.spacing(0, 2.5)};
  border-bottom: 1px solid ${theme.colors.border.subtle};
  background-color: ${theme.colors.background.surface};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text.muted};
  text-align: left;
  white-space: nowrap;
`;

export const bodyCell = (theme: Theme) => css`
  height: 2.5rem;
  padding: ${theme.spacing(0, 2.5)};
  border-bottom: 1px solid ${theme.colors.border.faint};
  color: ${theme.colors.text.primary};
  white-space: nowrap;
  transition: background-color ${theme.transitions.fast};
`;

/** Divisória vertical entre as colunas. */
export const columnDivider = (theme: Theme) => css`
  border-right: 1px solid ${theme.colors.border.faint};
`;

/** Moldura da tabela: borda fina, canto leve e rolagem própria. Mede a própria largura (para a versão em lista). */
export const TableCard = styled.div`
  container-type: inline-size;
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

export const Table = styled.table`
  ${staggerChildren(12, 25, "& tbody tr")};
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th {
    ${({ theme }) => headCell(theme)};
  }

  td {
    ${({ theme }) => bodyCell(theme)};
    /* Célula com duas linhas (nome e detalhe) cresce sem colar na borda */
    padding-block: ${({ theme }) => theme.spacing(1.5)};
  }

  th:first-of-type,
  td:first-of-type {
    padding-left: ${({ theme }) => theme.spacing(4)};
  }

  th:last-of-type,
  td:last-of-type {
    padding-right: ${({ theme }) => theme.spacing(4)};
  }

  th:not(:last-of-type),
  td:not(:last-of-type) {
    ${({ theme }) => columnDivider(theme)};
  }

  tbody tr:last-of-type td {
    border-bottom: 0;
  }

  tbody tr:hover td {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  /* Linha em gravação (arquivando, salvando) */
  tr[aria-busy] {
    opacity: 0.55;
  }
`;

/**
 * A tabela que, em espaço curto (celular, tablet, painel estreito), vira uma lista de cartões: cada célula mostra o
 * próprio título (data-label), sem rolagem lateral. Use dentro de <TableCard>.
 */
export const ResponsiveTable = styled(Table)`
  tbody tr { cursor: default; }
  tbody tr[data-clicavel] { cursor: pointer; }
  tbody tr[data-clicavel]:hover td { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
  td { transition: background-color ${({ theme }) => theme.transitions.fast}; }

  @container (max-width: 58rem) {
    display: block;
    thead { display: none; }
    tbody, tr, td { display: block; }
    tr { padding: ${({ theme }) => theme.spacing(3, 3.5)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
    tr:last-of-type { border-bottom: 0; }
    td, td:first-of-type, td:last-of-type, td:not(:last-of-type) { display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; height: auto; min-height: 1.75rem; padding: ${({ theme }) => theme.spacing(1, 0)}; border: 0; white-space: normal; text-align: right; }
    td > * { min-width: 0; }
    td[data-label]::before { content: attr(data-label); flex-shrink: 0; color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem; text-align: left; }
    td[data-principal] { justify-content: flex-start; text-align: left; padding-bottom: ${({ theme }) => theme.spacing(2)}; }
    td[data-acoes] { justify-content: flex-end; padding-top: ${({ theme }) => theme.spacing(2)}; }
    td[data-acoes]:empty { display: none; }
  }
`;
