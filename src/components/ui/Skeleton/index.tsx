"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { shimmer } from "@/styles/animations";

/** Bloco cinza com brilho passando: lugar de um conteúdo que ainda carrega. */
export const Skeleton = styled("span", transientOptions)<{
  $width?: string;
  $height?: string;
  $radius?: "sm" | "md" | "lg" | "full";
}>`
  display: block;
  width: ${({ $width = "100%" }) => $width};
  height: ${({ $height = "0.875rem" }) => $height};
  border-radius: ${({ theme, $radius = "sm" }) => theme.radii[$radius]};
  background: linear-gradient(
      90deg,
      transparent 25%,
      ${({ theme }) => theme.colors.shimmer} 50%,
      transparent 75%
    )
    ${({ theme }) => theme.palette.neutral[100]};
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;
