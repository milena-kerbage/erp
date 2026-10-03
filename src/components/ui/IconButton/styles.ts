import { css, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import {
  controlBase,
  controlSelected,
  controlVariant,
  type ControlVariant,
} from "@/styles/mixins";

export type IconButtonVariant = Exclude<ControlVariant, "danger">;
export type IconButtonSize = "sm" | "md" | "lg";

export const sizes: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: "2rem", icon: 16 },
  md: { box: "2.25rem", icon: 18 },
  lg: { box: "2.5rem", icon: 20 },
};

type StyleProps = {
  $variant: IconButtonVariant;
  $size: IconButtonSize;
  $active: boolean;
};

const buttonStyles = ({
  theme,
  $variant,
  $size,
  $active,
}: StyleProps & { theme: Theme }) => css`
  ${controlBase(theme)};
  ${controlVariant(theme, $variant)};
  ${$active && controlSelected(theme)};
  width: ${sizes[$size].box};
  height: ${sizes[$size].box};
`;

export const StyledButton = styled("button", transientOptions)<StyleProps>`
  ${buttonStyles}
`;

export const StyledLink = styled(Link, transientOptions)<StyleProps>`
  ${buttonStyles}
`;

/** Força o tamanho do ícone mesmo quando ele chega pronto (elemento). */
export const IconSlot = styled("span", transientOptions)<{ $size: number }>`
  display: inline-flex;

  > svg {
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
  }
`;

export const IndicatorSlot = styled.span`
  position: absolute;
  top: 0.4375rem;
  right: 0.4375rem;
`;
