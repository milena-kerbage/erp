import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { FilterBar } from "@/components/ui/FilterBar";
import { transientOptions } from "@/lib/emotion/transient";
import { DOCK_EASE } from "@/lib/dock";
import { EASE_OUT, staggerChildren } from "@/styles/animations";
import { DOCK_SPACE } from "@/styles/sheet";

/** Barra de rolagem afastada das bordas. */
const scrollInset = css`
  &::-webkit-scrollbar-track {
    margin-block: 10px;
  }
`;

/* ---------- Estrutura ---------- */

const chatIn = keyframes`
  from { opacity: 0; transform: translateX(2.5rem); }
  to { opacity: 1; transform: none; }
`;

const listIn = keyframes`
  from { opacity: 0; transform: translateX(-1rem); }
  to { opacity: 1; transform: none; }
`;

/** Lista de conversas à esquerda, conversa aberta à direita; painel de ponta a ponta. */
export const Root = styled.div`
  display: grid;
  flex: 1 1 0;
  grid-template-columns: 21.5rem minmax(0, 1fr);
  min-height: 0;

  /*
   * Celular (padrão WhatsApp): sem conversa aberta, só a lista; com uma
   * aberta, só a conversa, em tela cheia, com o voltar no cabeçalho.
   */
  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1fr);

    &[data-open] > [data-pane="list"],
    &:not([data-open]) > [data-pane="chat"] {
      display: none;
    }

    /* Abrir a conversa: ela chega da direita; voltar: a lista reaparece suave */
    &[data-open] > [data-pane="chat"] {
      animation: ${chatIn} 360ms ${DOCK_EASE};
    }

    &:not([data-open]) > [data-pane="list"] {
      animation: ${listIn} 300ms ${EASE_OUT};
    }

    @media (prefers-reduced-motion: reduce) {
      > [data-pane] {
        animation: none !important;
      }
    }
  }
`;

export const ListColumn = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.faint};

  ${({ theme }) => theme.media.md} {
    border-right: 0;
  }
`;

/** Conversa: só o fundo branco, como na oportunidade. */
export const ChatColumn = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

export const Placeholder = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(6)};
`;

/* ---------- Lista ---------- */

export const ListHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 3, 3, 5)};

  /* Celular: sem o header do app, a barra fica no topo (abaixo da área do relógio) */
  ${({ theme }) => theme.media.md} {
    padding: calc(${({ theme }) => theme.spacing(3)} + env(safe-area-inset-top)) ${({ theme }) => theme.spacing(4)}
      ${({ theme }) => theme.spacing(3)};
  }
`;

/** Busca + filtros + funil numa linha (a busca encolhe na coluna estreita). */
export const ListFilters = styled(FilterBar)`
  > label:first-of-type {
    flex: 1 1 0;
    min-width: 0;
  }
`;

export const List = styled.ul`
  ${staggerChildren(12, 30)};
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  /* Folga entre a barra de rolagem e a divisória */
  margin-right: 4px;
  padding: ${({ theme }) => theme.spacing(0, 2, 3, 3)};
  overflow-y: auto;
  ${scrollInset};

  /* Celular: a lista vai até embaixo; a última conversa sobe acima do dock */
  ${({ theme }) => theme.media.md} {
    margin-right: 0;
    padding: ${({ theme }) => theme.spacing(0, 2)} ${DOCK_SPACE};
  }
`;

export const ListEmpty = styled.li`
  padding: ${({ theme }) => theme.spacing(10, 4)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;

/* ---------- Item da lista ---------- */

export const Item = styled(Link, transientOptions)<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $selected }) => ($selected ? theme.colors.interactive.pressed : "transparent")};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $selected }) =>
      $selected ? theme.colors.interactive.pressed : theme.colors.interactive.hover};
  }
`;

export const ItemTexts = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

export const ItemRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
`;

export const ItemName = styled("span", transientOptions)<{ $unread: boolean }>`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $unread }) => ($unread ? theme.fontWeights.semibold : theme.fontWeights.medium)};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const ItemTime = styled("span", transientOptions)<{ $unread: boolean }>`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: ${({ theme, $unread }) => ($unread ? theme.fontWeights.semibold : theme.fontWeights.regular)};
  color: ${({ theme, $unread }) => ($unread ? theme.colors.text.brand : theme.colors.text.muted)};
`;

export const ItemPreview = styled("span", transientOptions)<{ $unread: boolean }>`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme, $unread }) => ($unread ? theme.colors.text.secondary : theme.colors.text.muted)};

  svg {
    flex-shrink: 0;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export const ItemTrail = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

export const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrast};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1;
`;

/* ---------- Cabeçalho da conversa ---------- */

export const ChatActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/* ---------- Atividade ---------- */

/** Resumo do que aconteceu no atendimento, no topo da conversa. */
export const ActivityCard = styled.section`
  position: relative;
  z-index: 1;
  max-width: 46rem;
  margin: ${({ theme }) => theme.spacing(4)} auto ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(3, 3.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  /* Opaco: o pontilhado do fundo não aparece por trás */
  background-color: color-mix(
    in srgb,
    ${({ theme }) => theme.palette.neutral[900]} 3.5%,
    ${({ theme }) => theme.palette.neutral[0]}
  );
`;

export const ActivityHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 1.75rem;
  margin-bottom: ${({ theme }) => theme.spacing(1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const ActivityList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
`;

export const ActivityRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const ActivityText = styled.span`
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;

  > svg {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const ActivityTime = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;
