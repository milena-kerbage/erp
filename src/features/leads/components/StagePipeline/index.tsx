"use client";

import type { ReactNode } from "react";
import { useTheme, type Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleDashedIcon } from "@phosphor-icons/react";
import { FieldTrigger } from "@/components/ui/Editable";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import type { FunnelStage } from "../../funnels";

type StagePipelineProps = {
  stages: readonly FunnelStage[];
  current: string;
  onMove: (stage: string) => void;
  /** Conteúdo à esquerda da etapa atual (ex.: troca de funil). */
  leading?: ReactNode;
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Track = styled.div`
  display: flex;
  gap: 3px;
  /* A área clicável é maior que a barra, para acertar fácil */
  margin: ${({ theme }) => theme.spacing(-1, 0)};
`;

const strong = (theme: Theme, tone: Tone) =>
  `color-mix(in srgb, ${theme.tones[tone].fg} 60%, ${theme.tones[tone].soft})`;

const Step = styled("button", transientOptions)<{ $tone: Tone; $filled: boolean; $current: boolean }>`
  display: flex;
  flex: 1;
  align-items: center;
  height: 1rem;
  padding: 0;
  cursor: ${({ $current }) => ($current ? "default" : "pointer")};

  /* A barra em si */
  &::before {
    content: "";
    flex: 1;
    height: 4px;
    border-radius: ${({ theme }) => theme.radii.full};
    background-color: ${({ theme, $tone, $filled }) =>
      $filled ? strong(theme, $tone) : theme.palette.neutral[200]};
    transition:
      height ${({ theme }) => theme.transitions.fast},
      background-color ${({ theme }) => theme.transitions.normal};
  }

  /* Prévia: ao passar o mouse, a barra engrossa e ganha a cor da etapa */
  &:hover::before,
  &:focus-visible::before {
    height: 8px;
    background-color: ${({ theme, $tone }) => strong(theme, $tone)};
  }

  &:focus-visible {
    outline-offset: 1px;
    border-radius: ${({ theme }) => theme.radii.xs};
  }
`;

const StageName = styled.span`
  overflow: hidden;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Position = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

/**
 * Etapas do funil em uma linha discreta: a etapa atual abre a lista para
 * mover, e cada trecho da barra leva direto para aquela etapa.
 */
export function StagePipeline({ stages, current, onMove, leading }: StagePipelineProps) {
  const theme = useTheme();
  const index = stages.findIndex((stage) => stage.id === current);
  const stage = stages[index];

  return (
    <Root>
      <Header>
        {leading ?? <span />}

        <Select
          label="Etapa"
          heading="Mover para"
          align="end"
          width="15rem"
          value={current}
          onChange={(id) => id !== current && onMove(id)}
          options={stages.map((item, position) => ({
            value: item.id,
            label: item.label,
            meta: `${position + 1}/${stages.length}`,
            leading: <CircleDashedIcon size={18} weight="bold" color={theme.tones[item.tone].fg} />,
          }))}
          trigger={({ open: _open, ...props }) => (
            <FieldTrigger type="button" {...props} aria-label={`Etapa: ${stage?.label}. Mover`}>
              {stage && <CircleDashedIcon size={15} weight="bold" color={theme.tones[stage.tone].fg} aria-hidden />}
              <StageName>{stage?.label}</StageName>
              <Position>
                {index + 1}/{stages.length}
              </Position>
            </FieldTrigger>
          )}
        />
      </Header>

      <Track role="group" aria-label="Etapas do funil">
        {stages.map((item, position) => {
          const isCurrent = position === index;
          return (
            <Tooltip
              key={item.id}
              label={isCurrent ? `Etapa atual: ${item.label}` : `Mover para ${item.label}`}
              side="top"
              delay={120}
            >
              <Step
                type="button"
                $tone={item.tone}
                $filled={position <= index}
                $current={isCurrent}
                aria-label={isCurrent ? `${item.label}, etapa atual` : `Mover para ${item.label}`}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => !isCurrent && onMove(item.id)}
              />
            </Tooltip>
          );
        })}
      </Track>
    </Root>
  );
}
