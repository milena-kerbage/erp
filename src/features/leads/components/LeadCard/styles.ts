import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";

export const Card = styled("article", transientOptions)<{ $dragging: boolean }>`
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  cursor: grab;
  opacity: ${({ $dragging }) => ($dragging ? 0.45 : 1)};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    opacity ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:active {
    cursor: grabbing;
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.border.strong};
  }

  /* Controles do card ficam acima do link que o cobre */
  button {
    position: relative;
    z-index: 1;
  }

  /* Celular: sem arrastar (a etapa muda pelo "Mover para"); toque sem atraso */
  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(2.5)};
    cursor: default;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      border-color: ${({ theme }) => theme.colors.border.subtle};
    }

    &:active {
      cursor: default;
      border-color: ${({ theme }) => theme.colors.border.default};
    }
  }
`;

/** Link do nome esticado sobre o card inteiro. */
export const CardLink = styled(Link)`
  color: inherit;
  outline: none;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }
`;

export const Top = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  min-width: 0;
`;

export const Identity = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const Name = styled.h3`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Phone = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

export const Budget = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

/* Cabeçalho do "Mover para": de quem é e em que etapa está */
export const MoveHeader = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
`;

export const MoveHeaderTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`;

export const MoveHeaderName = styled.span`
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const MoveHeaderCaption = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;
