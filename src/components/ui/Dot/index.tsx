"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";

type DotProps = {
  tone: Tone;
  /** Diâmetro em px. */
  size?: number;
  className?: string;
};

const Root = styled("span", transientOptions)<{ $tone: Tone; $size: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  /* Meio-termo entre o pastel e o tom forte: cor viva, mas suave */
  background-color: ${({ theme, $tone }) =>
    `color-mix(in srgb, ${theme.tones[$tone].fg} 55%, ${theme.tones[$tone].soft})`};
`;

/** Bolinha de cor para identificar etapas, funis e categorias. */
export function Dot({ tone, size = 8, className }: DotProps) {
  return <Root aria-hidden $tone={tone} $size={size} className={className} />;
}
