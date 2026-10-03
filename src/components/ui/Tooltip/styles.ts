import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

export type TooltipSide = "top" | "right" | "bottom" | "left";

const offset: Record<TooltipSide, string> = {
  top: "translate(-50%, calc(-100% + 4px))",
  right: "translate(-4px, -50%)",
  bottom: "translate(-50%, -4px)",
  left: "translate(calc(-100% + 4px), -50%)",
};

const settled: Record<TooltipSide, string> = {
  top: "translate(-50%, -100%)",
  right: "translate(0, -50%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
};

const enter = (side: TooltipSide) => keyframes`
  from {
    opacity: 0;
    transform: ${offset[side]};
  }
  to {
    opacity: 1;
    transform: ${settled[side]};
  }
`;

export const Trigger = styled.span`
  display: contents;
`;

export const Bubble = styled("div", transientOptions)<{ $side: TooltipSide }>`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  padding: ${({ theme }) => theme.spacing(1.5, 2.5)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme }) => theme.colors.tooltip.background};
  color: ${({ theme }) => theme.colors.tooltip.text};
  box-shadow: ${({ theme }) => theme.shadows.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  white-space: nowrap;
  pointer-events: none;
  transform: ${({ $side }) => settled[$side]};
  animation: ${({ $side }) => enter($side)} 140ms ease-out;
`;
