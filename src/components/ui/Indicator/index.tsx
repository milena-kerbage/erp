"use client";

import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

type IndicatorProps = {
  /** Cor do anel de separação — use a cor do fundo onde o ponto está. */
  ringColor?: string;
  className?: string;
};

const Dot = styled("span", transientOptions)<{ $ring?: string }>`
  display: block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.attention};
  box-shadow: 0 0 0 2px
    ${({ theme, $ring }) => $ring ?? theme.colors.background.elevated};
  pointer-events: none;
`;

/**
 * Ponto de notificação. Puramente visual: informe o estado no nome
 * acessível do elemento pai (ex.: "Notificações, há novidades").
 */
export function Indicator({ ringColor, className }: IndicatorProps) {
  return <Dot aria-hidden $ring={ringColor} className={className} />;
}
