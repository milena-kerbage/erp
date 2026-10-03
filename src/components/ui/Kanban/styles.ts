import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { staggerChildren } from "@/styles/animations";
import { DOCK_SPACE } from "@/styles/sheet";
import type { Tone } from "@/styles/theme";

/** Faixa horizontal de colunas; ocupa a altura disponível. */
export const Board = styled.div`
  ${staggerChildren(10, 45)};
  /* Referência das posições das colunas (paginador do celular) */
  position: relative;
  display: flex;
  flex: 1 1 0;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 0;
  /* Espaço para o foco e a barra de rolagem */
  margin: ${({ theme }) => theme.spacing(-1)};
  padding: ${({ theme }) => theme.spacing(1, 1, 2)};
  overflow-x: auto;
  overscroll-behavior-x: contain;

  /*
   * Celular: uma etapa por vez, parando no centro, com as vizinhas espiando
   * pelas bordas. A rolagem vai de ponta a ponta da tela, e os espaçadores das
   * pontas deixam a primeira e a última pararem no centro também.
   */
  ${({ theme }) => theme.media.md} {
    --mobile-column: min(19rem, calc(100vw - 4.5rem));
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing(3)};
    margin: 0 ${({ theme }) => theme.spacing(-4)};
    padding: ${({ theme }) => theme.spacing(0.5, 0, 0)};
    scroll-snap-type: x mandatory;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    &::before,
    &::after {
      content: "";
      flex: 0 0 auto;
      width: max(0px, calc((100% - var(--mobile-column)) / 2 - ${({ theme }) => theme.spacing(3)}));
    }
  }
`;

export const Column = styled("section", transientOptions)<{ $tone: Tone; $dropping: boolean }>`
  display: flex;
  /* Largura fixa; o quadro rola na horizontal quando não cabe */
  flex: 0 0 18.5rem;
  flex-direction: column;
  width: 18.5rem;
  max-height: 100%;
  padding: ${({ theme }) => theme.spacing(2)};
  border: 1.5px dashed ${({ theme, $tone, $dropping }) => ($dropping ? theme.tones[$tone].fg : "transparent")};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme, $tone, $dropping }) => ($dropping ? theme.tones[$tone].soft : theme.tones[$tone].bg)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  ${({ theme }) => theme.media.md} {
    flex: 0 0 var(--mobile-column);
    width: var(--mobile-column);
    scroll-snap-align: center;
  }
`;

/** Total da etapa (ex.: soma dos orçamentos), numa linha discreta sob o título. */
/** Total da etapa, à direita do título (antes do "+"). */
export const ColumnMeta = styled.span`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(0, 1)};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`;

/** Etapa sem nada: a coluna continua, com um aviso discreto. */
export const ColumnEmpty = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 5rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

export const ColumnHeader = styled.header`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

export const TitlePill = styled("h2", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;

  > svg {
    flex-shrink: 0;
    color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  }
`;

export const TitleText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Count = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1)};
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme, $tone }) =>
    `color-mix(in srgb, ${theme.tones[$tone].fg} 14%, ${theme.tones[$tone].soft})`};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

export const ColumnActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
`;

export const Cards = styled.div`
  ${staggerChildren(10, 35)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 0;
  /* Espaço para o foco não ser cortado pelo scroll */
  margin: ${({ theme }) => theme.spacing(-0.5)};
  padding: ${({ theme }) => theme.spacing(0.5)};
  overflow-y: auto;
  overscroll-behavior: contain;

  /* Celular: a coluna vai até embaixo; o último card sobe acima do dock */
  ${({ theme }) => theme.media.md} {
    padding-bottom: ${DOCK_SPACE};
  }
`;

export const AddButton = styled("button", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 2rem;
  margin-top: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-align: left;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  }

  /* No celular o "+" do cabeçalho faz isso (o rodapé fica embaixo do dock) */
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;
