import styled from "@emotion/styled";

/**
 * Trocas de visual por tamanho de tela feitas no CSS (e não no JS), para a
 * primeira tela do servidor já sair certa, sem pular na hidratação.
 */

/** Só no computador (some até 1024px). */
export const WideOnly = styled.span`
  display: contents;

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Só no celular (até 1024px). */
export const NarrowOnly = styled.span`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: contents;
  }
`;
