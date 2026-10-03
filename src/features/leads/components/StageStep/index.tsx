"use client";

import styled from "@emotion/styled";
import { CheckIcon } from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";

export type StageState = "past" | "current" | "future";

type StageStepProps = {
  tone: Tone;
  state: StageState;
  first: boolean;
  last: boolean;
};

const MARKER = 14;

/** Coluna com o marcador e a linha que liga as etapas (linha do tempo). */
const Track = styled("span", transientOptions)<{ $first: boolean; $last: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 100%;

  /* Linha acima e abaixo do marcador, cobrindo o espaço entre as linhas */
  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 2px;
    height: calc(50% - ${MARKER / 2 + 3}px + 1px);
    transform: translateX(-50%);
    border-radius: 2px;
    background-color: ${({ theme }) => theme.colors.border.subtle};
  }

  &::before {
    top: -1px;
    display: ${({ $first }) => ($first ? "none" : "block")};
  }

  &::after {
    bottom: -1px;
    display: ${({ $last }) => ($last ? "none" : "block")};
  }
`;

const Marker = styled("span", transientOptions)<{ $tone: Tone; $state: StageState }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${MARKER}px;
  height: ${MARKER}px;
  border-radius: 50%;
  color: ${({ theme }) => theme.palette.neutral[0]};

  ${({ theme, $tone, $state }) => {
    const tone = theme.tones[$tone];
    const strong = `color-mix(in srgb, ${tone.fg} 60%, ${tone.soft})`;

    if ($state === "past") return `background-color: ${strong};`;
    if ($state === "current")
      return `
        background-color: ${tone.soft};
        box-shadow: inset 0 0 0 2px ${tone.fg};
      `;
    return `
      background-color: ${theme.palette.neutral[0]};
      box-shadow: inset 0 0 0 1.5px ${strong};
    `;
  }}
`;

const CurrentDot = styled("span", transientOptions)<{ $tone: Tone }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ theme, $tone }) => theme.tones[$tone].fg};
`;

/**
 * Marcador de etapa: passadas preenchidas com check, a atual com anel e as
 * próximas vazadas — ligadas por uma linha, como um caminho.
 */
export function StageStep({ tone, state, first, last }: StageStepProps) {
  return (
    <Track $first={first} $last={last} aria-hidden>
      <Marker $tone={tone} $state={state}>
        {state === "past" && <CheckIcon size={9} weight="bold" />}
        {state === "current" && <CurrentDot $tone={tone} />}
      </Marker>
    </Track>
  );
}
