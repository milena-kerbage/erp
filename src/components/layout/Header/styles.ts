import styled from "@emotion/styled";
import { css } from "@emotion/react";

/**
 * Faixa superior, 100% da largura e sem fundo próprio, em três colunas: [logo + trilha] [menu] [ações + conta].
 * As laterais dividem o espaço que sobra por igual, então o menu fica sempre no centro da tela.
 */
export const Root = styled.header`
  grid-area: header;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  min-width: 0;
  height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 ${({ theme }) => theme.spacing(4)};
`;

export const Start = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
  overflow: hidden;

  > a:first-of-type {
    flex-shrink: 0;
  }

  /* Telas médias: só a página atual na trilha */
  ${({ theme }) => theme.media.xl} {
    nav li:not(:last-of-type),
    nav li:last-of-type > svg:first-child {
      display: none;
    }
  }
`;

export const Center = styled.div`
  display: flex;
  justify-content: center;
`;

export const End = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;

  /* A busca fica mais curta para dar espaço ao menu */
  > button[data-busca] {
    flex: 0 1 13rem;
    min-width: 2.25rem;
  }

  /* Telas médias: a busca vira só a lupa */
  ${({ theme }) => theme.media.xl} {
    > button[data-busca] {
      flex: 0 0 2.25rem;
      width: 2.25rem;
      padding: 0;
      justify-content: center;
      > span, > kbd { display: none; }
    }
  }
`;

export const Divider = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 1.25rem;
  background-color: ${({ theme }) => theme.colors.border.default};
`;

/** Botões com ícone viram quadradinhos só com o ícone (celular e telas médias). */
export const acoesSoIcone = css`
  & > a:not([data-keep-label]):has(> [data-icon="start"]),
  & > button:not([data-keep-label]):has(> [data-icon="start"]) {
    width: 2.25rem;
    padding: 0;
    justify-content: center;
  }

  & > a:not([data-keep-label]):has(> [data-icon="start"]) > [data-button-label],
  & > button:not([data-keep-label]):has(> [data-icon="start"]) > [data-button-label] {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  & > a:not([data-keep-label]):has(> [data-icon="start"]) > [data-icon="end"],
  & > button:not([data-keep-label]):has(> [data-icon="start"]) > [data-icon="end"] {
    display: none;
  }
`;

/** Ações da página (via <HeaderActions>), separadas da busca por um divisor. */
export const PageActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-right: ${({ theme }) => theme.spacing(1)};
  padding-right: ${({ theme }) => theme.spacing(3)};
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};

  ${({ theme }) => theme.media.xl} {
    ${acoesSoIcone}
  }

  &:empty {
    display: none;
  }
`;
