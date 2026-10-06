import styled from "@emotion/styled";
import { DOCK_SPACE } from "@/styles/sheet";

/**
 * Header em cima (100% da largura), sidebar à esquerda e painel à direita.
 * A página não rola: só o painel tem scroll, então header e sidebar
 * ficam sempre visíveis.
 */
export const Root = styled.div`
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar panel";
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: ${({ theme }) => theme.layout.headerHeight} minmax(0, 1fr);
  height: 100vh;
  height: var(--app-height, 100dvh);
  /* clip (e não hidden): nada consegue rolar a estrutura, nem scrollIntoView/foco */
  overflow: hidden;
  overflow: clip;
  background: ${({ theme }) => theme.colors.background.gradient};

  /*
   * Celular: sem sidebar (o menu fica no dock de baixo) e quem rola é a
   * própria página (rolagem nativa: a barra do navegador recolhe e o gesto
   * não arrasta a estrutura). O topo fica grudado.
   */
  ${({ theme }) => theme.media.md} {
    grid-template-areas: "panel";
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
    height: auto;
    min-height: var(--app-height, 100dvh);
    overflow: visible;
    overflow-x: clip;
    /* Fundo branco no celular: o degradê esverdeado destoava do chat e dos cartões */
    background: ${({ theme }) => theme.palette.neutral[0]};

    /* Nenhuma tela tem header no celular: cada página tem o próprio topo, e os
       botões que iam no header entram no MobileHeaderSlot da página */
    > header {
      display: none;
    }

    /* Telas de altura cheia (kanban, conversas, oportunidade, tabelas): a tela
       fica parada e cada lista rola por dentro */
    &:has([data-fill], [data-flush]) {
      grid-template-rows: minmax(0, 1fr);
      height: var(--app-height, 100dvh);
      min-height: 0;
      overflow: clip;
    }
  }
`;

/** Única superfície com fundo: contém as seções do módulo e o conteúdo. */
export const Panel = styled.div`
  grid-area: panel;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin: 0 ${({ theme }) => theme.layout.panelGap} ${({ theme }) => theme.layout.panelGap} 0;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.layout.panelRadius};
  background-color: ${({ theme }) => theme.colors.background.surface};
  box-shadow: ${({ theme }) => theme.shadows.xs};

  ${({ theme }) => theme.media.md} {
    margin: 0;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background-color: transparent;
    box-shadow: none;

    &:has([data-fill], [data-flush]) {
      overflow: hidden;
    }
  }
`;

/**
 * Coluna flex que ocupa ao menos a altura do painel: telas comuns crescem e
 * rolam o painel; telas "cheias" (ex.: kanban) usam flex: 1 no filho.
 */
export const Main = styled.main`
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;

  &:has([data-fill], [data-flush]) {
    flex: 1 1 0;
  }

  padding: ${({ theme }) => theme.spacing(6)};

  /* Telas de ponta a ponta (ex.: detalhe do lead) ocupam o painel inteiro */
  &:has([data-flush]) {
    padding: 0;
  }

  &:focus {
    outline: none;
  }

  /*
   * Celular: o dock flutua por cima de tudo, sem reservar faixa. Telas que
   * rolam ganham só uma folga no fim do conteúdo (aparece ao chegar lá);
   * telas que ocupam a altura toda (data-fill) vão até a borda de baixo.
   */
  ${({ theme }) => theme.media.md} {
    /* Sem header: o topo fica logo abaixo da área do relógio */
    padding: calc(${({ theme }) => theme.spacing(3)} + env(safe-area-inset-top)) ${({ theme }) => theme.spacing(4)}
      ${DOCK_SPACE};

    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));

    &:has([data-fill]) {
      padding-bottom: calc(${({ theme }) => theme.spacing(2)} + env(safe-area-inset-bottom));
    }

    &:has([data-flush]) {
      padding: 0;
    }
  }
`;

export const SkipLink = styled.a`
  position: fixed;
  top: ${({ theme }) => theme.spacing(3)};
  left: ${({ theme }) => theme.spacing(3)};
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  padding: ${({ theme }) => theme.spacing(2.5, 4)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.primary.strong};
  color: ${({ theme }) => theme.colors.primary.contrast};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  transform: translateY(-200%);
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:focus-visible {
    transform: translateY(0);
  }
`;
