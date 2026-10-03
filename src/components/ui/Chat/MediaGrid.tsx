"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { shimmer } from "@/styles/animations";

export type MediaImage = { url: string; name: string };

type MediaGridProps = {
  images: readonly MediaImage[];
  onOpen: (index: number) => void;
};

/** Caixa fixa: toda imagem ocupa o mesmo espaço na conversa, seja qual for o formato. */
export const MEDIA_WIDTH = "16rem";
export const MEDIA_HEIGHT = "12rem";

const MAX_VISIBLE = 4;

/** 1 imagem: inteira; 2: lado a lado; 3: uma grande e duas empilhadas; 4+: grade 2×2. */
const layouts: Record<number, string> = {
  1: `grid-template: "a" 1fr / 1fr;`,
  2: `grid-template: "a b" 1fr / 1fr 1fr;`,
  3: `grid-template: "a b" 1fr "a c" 1fr / 1fr 1fr;`,
  4: `grid-template: "a b" 1fr "c d" 1fr / 1fr 1fr;`,
};

const AREAS = ["a", "b", "c", "d"];

const Grid = styled("div", transientOptions)<{ $count: number }>`
  display: grid;
  ${({ $count }) => layouts[Math.min($count, MAX_VISIBLE)]};
  gap: 3px;
  width: ${MEDIA_WIDTH};
  max-width: 100%;
  height: ${MEDIA_HEIGHT};
  overflow: hidden;
  /* Concêntrico com o balão (raio lg, 3px de recuo) */
  border-radius: calc(${({ theme }) => theme.radii.lg} - 3px);
`;

const Cell = styled("button", transientOptions)<{ $area: string; $more: number }>`
  position: relative;
  grid-area: ${({ $area }) => $area};
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  /* Brilho de carregamento; a imagem cobre quando chega */
  background: linear-gradient(90deg, transparent 25%, ${({ theme }) => theme.colors.shimmer} 50%, transparent 75%)
    ${({ theme }) => theme.colors.interactive.pressed};
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
  cursor: zoom-in;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform ${({ theme }) => theme.transitions.slow};
  }

  &:hover img {
    transform: scale(1.03);
  }

  &::after {
    content: ${({ $more }) => ($more > 0 ? `"+${$more}"` : "none")};
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(18, 20, 17, 0.45);
    font-size: ${({ theme }) => theme.fontSizes.xl};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: #fff;
  }
`;

/** Imagens da mensagem renderizadas de verdade; clique abre em tela cheia. */
export function MediaGrid({ images, onOpen }: MediaGridProps) {
  const visible = images.slice(0, MAX_VISIBLE);
  const extra = images.length - visible.length;

  return (
    <Grid $count={visible.length}>
      {visible.map((image, index) => (
        <Cell
          key={image.url}
          type="button"
          aria-label={`Abrir ${image.name}`}
          $area={AREAS[index]}
          $more={index === visible.length - 1 ? extra : 0}
          onClick={() => onOpen(index)}
        >
          <img src={image.url} alt={image.name} loading="lazy" decoding="async" />
        </Cell>
      ))}
    </Grid>
  );
}
