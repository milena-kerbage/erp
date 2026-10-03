"use client";

import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import { renderIcon, type IconSource } from "@/lib/icons";
import type { Tone } from "@/styles/theme";

type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  icon?: IconSource;
  className?: string;
};

const Root = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3px;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.75)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1;
  white-space: nowrap;

  svg {
    width: 11px;
    height: 11px;
  }
`;

/** Selo curto de status ou destaque (ex.: "Novo", "Admin", "Atrasado"). */
export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  return (
    <Root $tone={tone} className={className}>
      {icon && renderIcon(icon, { weight: "fill", "aria-hidden": true })}
      {children}
    </Root>
  );
}
