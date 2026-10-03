"use client";

import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";

type TagProps = {
  children: ReactNode;
  tone?: Tone;
  /** `outline` para contadores como "+3". */
  variant?: "soft" | "outline";
  title?: string;
  className?: string;
};

const Root = styled("span", transientOptions)<{ $tone: Tone; $variant: "soft" | "outline" }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border: 1px solid
    ${({ theme, $variant }) => ($variant === "outline" ? theme.colors.border.default : "transparent")};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone, $variant }) =>
    $variant === "outline" ? theme.palette.neutral[0] : theme.tones[$tone].soft};
  color: ${({ theme, $tone, $variant }) =>
    $variant === "outline" ? theme.colors.text.secondary : theme.tones[$tone].fg};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1;
  white-space: nowrap;
`;

/** Etiqueta curta em tom pastel (categorias, origens, marcadores). */
export function Tag({ children, tone = "neutral", variant = "soft", title, className }: TagProps) {
  return (
    <Root $tone={tone} $variant={variant} title={title} className={className}>
      {children}
    </Root>
  );
}

const TAG_TONES: Tone[] = ["blue", "lavender", "peach", "rose", "green", "yellow", "teal"];

/** Tom estável para um texto: a mesma etiqueta tem sempre a mesma cor. */
export function toneFor(text: string): Tone {
  let hash = 0;
  for (const char of text.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TAG_TONES[hash % TAG_TONES.length];
}
