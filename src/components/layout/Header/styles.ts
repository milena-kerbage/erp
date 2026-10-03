import styled from "@emotion/styled";

/**
 * Faixa superior, 100% da largura e sem fundo próprio.
 *
 * Três grupos: [marca + trilha] [título] [ferramentas]. O título fica no meio
 * do espaço livre — a mesma distância até a trilha e até as ferramentas —,
 * que é onde o olho percebe o centro (o header não tem fundo nem bordas).
 */
export const Root = styled.header`
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(6)};
  min-width: 0;
  height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 ${({ theme }) => theme.layout.panelGap};

  /* Celular: título (ou quem está usando, no Painel) à esquerda e ações à direita */
  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(3)};
    padding: 0 ${({ theme }) => theme.spacing(4)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`;

export const Start = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  min-width: 0;
  /* Alinha o botão do menu com os ícones da sidebar */
  margin-left: 0.375rem;

  ${({ theme }) => theme.media.md} {
    flex-shrink: 1;
    margin-left: 0;
  }
`;

/** Só no celular: título da página ou, no Painel, a pessoa logada. */
export const MobileLead = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2.5)};
    min-width: 0;

    h1,
    strong {
      overflow: hidden;
      font-size: 1.0625rem;
      font-weight: ${({ theme }) => theme.fontWeights.semibold};
      letter-spacing: -0.01em;
      color: ${({ theme }) => theme.colors.text.primary};
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
`;

export const Brand = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Divider = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 1.25rem;
  background-color: ${({ theme }) => theme.colors.border.default};

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Some no celular (o menu, a trilha e o sino vão para o dock/menu de baixo). */
export const DesktopOnly = styled.span`
  display: contents;

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Nome da página. */
export const Title = styled.h1`
  flex-shrink: 0;
  max-width: 32vw;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

export const Tools = styled.div`
  display: flex;
  flex-shrink: 1;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
`;

/** Ações da página (via <HeaderActions>), separadas por um divisor. */
export const PageActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-left: ${({ theme }) => theme.spacing(1)};
  padding-left: ${({ theme }) => theme.spacing(3)};
  border-left: 1px solid ${({ theme }) => theme.colors.border.default};

  /* Celular: sem divisor; botões com ícone viram quadradinhos só com o ícone */
  ${({ theme }) => theme.media.md} {
    min-width: 0;
    margin-left: 0;
    padding-left: 0;
    border-left: 0;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

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
  }

  &:empty {
    display: none;
  }
`;
