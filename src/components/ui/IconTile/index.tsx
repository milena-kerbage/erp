"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { renderIcon, type IconSource } from "@/lib/icons";
import type { Tone } from "@/styles/theme";

export type IconTileSize = "sm" | "md" | "lg";

const sizes: Record<IconTileSize, { box: string; icon: number; radius: "xs" | "sm" | "md" }> = {
  sm: { box: "1.25rem", icon: 12, radius: "xs" },
  md: { box: "1.625rem", icon: 15, radius: "sm" },
  lg: { box: "2rem", icon: 18, radius: "md" },
};

type IconTileProps = {
  icon: IconSource;
  tone: Tone;
  size?: IconTileSize;
  className?: string;
};

const Root = styled("span", transientOptions)<{ $tone: Tone; $size: IconTileSize }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => sizes[$size].box};
  height: ${({ $size }) => sizes[$size].box};
  border-radius: ${({ theme, $size }) => theme.radii[sizes[$size].radius]};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};

  svg {
    width: ${({ $size }) => sizes[$size].icon}px;
    height: ${({ $size }) => sizes[$size].icon}px;
  }
`;

/** Ícone num quadrado suave na cor do tom (funis, categorias, atalhos). */
export function IconTile({ icon, tone, size = "md", className }: IconTileProps) {
  return (
    <Root aria-hidden $tone={tone} $size={size} className={className}>
      {renderIcon(icon, { weight: "fill" })}
    </Root>
  );
}
