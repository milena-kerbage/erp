import { css, keyframes, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { controlBase, controlVariant, type ControlVariant } from "@/styles/mixins";

export type ButtonVariant = ControlVariant;
export type ButtonSize = "sm" | "md" | "lg";

export const buttonSizes: Record<
  ButtonSize,
  { height: string; paddingX: number; font: keyof Theme["fontSizes"]; icon: number }
> = {
  sm: { height: "2rem", paddingX: 3, font: "xs", icon: 14 },
  md: { height: "2.25rem", paddingX: 3.5, font: "sm", icon: 16 },
  lg: { height: "2.5rem", paddingX: 4, font: "sm", icon: 18 },
};

type StyleProps = {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $iconStart: boolean;
  $iconEnd: boolean;
};

/** O ícone tem folga interna: tira 2px do lado dele para o respiro parecer igual. */
const OPTICAL = 0.5;

const buttonStyles = ({
  theme,
  $variant,
  $size,
  $fullWidth,
  $iconStart,
  $iconEnd,
}: StyleProps & { theme: Theme }) => css`
  ${controlBase(theme)};
  ${controlVariant(theme, $variant)};
  gap: ${theme.spacing(1.5)};
  width: ${$fullWidth ? "100%" : "auto"};
  height: ${buttonSizes[$size].height};
  padding: ${theme.spacing(
    0,
    buttonSizes[$size].paddingX - ($iconEnd ? OPTICAL : 0),
    0,
    buttonSizes[$size].paddingX - ($iconStart ? OPTICAL : 0),
  )};
  font-size: ${theme.fontSizes[buttonSizes[$size].font]};
  font-weight: ${theme.fontWeights.medium};
  line-height: 1;
  white-space: nowrap;
`;

export const StyledButton = styled("button", transientOptions)<StyleProps>`
  ${buttonStyles}
`;

export const StyledLink = styled(Link, transientOptions)<StyleProps>`
  ${buttonStyles}
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/** Força o tamanho do ícone mesmo quando ele chega pronto (elemento). */
export const IconSlot = styled("span", transientOptions)<{ $size: number }>`
  display: inline-flex;

  > svg {
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
  }
`;

export const Spinner = styled(IconSlot)`
  animation: ${spin} 0.8s linear infinite;
`;
