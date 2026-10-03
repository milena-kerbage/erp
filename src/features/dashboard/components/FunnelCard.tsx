"use client";

import { useState } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { CaretDownIcon } from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { transientOptions } from "@/lib/emotion/transient";
import type { Funnel } from "@/features/leads/funnels";
import { formatMoney, type StageValue } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

/* ---------- Estilos ---------- */

/** Uma barra só com a parte do valor de cada etapa, lado a lado. */
const Stack = styled.div`
  display: flex;
  gap: 3px;
  height: 0.75rem;
`;

const Piece = styled("span", transientOptions)<{ $color: string; $dim: boolean }>`
  min-width: 6px;
  border-radius: 3px;
  background-color: ${({ $color }) => $color};
  opacity: ${({ $dim }) => ($dim ? 0.3 : 1)};
  transition:
    opacity 160ms,
    flex-grow 400ms;
`;

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => theme.spacing(0, -2)};
`;

const Row = styled("li", transientOptions)<{ $dim: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem 6.5rem 2.75rem;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.primary};
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  transition:
    opacity 160ms,
    background-color 160ms;

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  > span:first-of-type {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2)};
    min-width: 0;
    overflow: hidden;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  > small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
    text-align: right;
  }

  > strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    text-align: right;
    white-space: nowrap;
  }

  > em {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-style: normal;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.secondary};
    text-align: right;
  }
`;

const Dot = styled("span", transientOptions)<{ $color: string }>`
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};
`;

const Trigger = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 2, 0, 1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &[aria-expanded="true"] {
    border-color: ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  > svg:last-of-type {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/* ---------- Componente ---------- */

/**
 * Funil numa olhada: a barra mostra como o valor se divide entre as etapas e
 * a lista traz leads, valor e parte de cada uma. Passar o ponteiro destaca.
 */
export function FunnelCard({
  funnel,
  funnels,
  stages,
  onFunnelChange,
}: {
  funnel: Funnel | undefined;
  funnels: readonly Funnel[];
  stages: StageValue[];
  onFunnelChange: (id: string) => void;
}) {
  const theme = useTheme();
  const [hover, setHover] = useState<string | null>(null);
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);
  const count = stages.reduce((sum, stage) => sum + stage.count, 0);
  const color = (id: string) => theme.tones[funnel?.stages.find((stage) => stage.id === id)?.tone ?? "neutral"].fg;

  return (
    <Card aria-label={`Funil ${funnel?.name ?? ""}`}>
      <CardHead
        title="Funil de vendas"
        subtitle={`${formatMoney(total)} em ${count} ${count === 1 ? "lead" : "leads"}, hoje`}
      >
        <Select
          label="Funil do cartão"
          heading="Funil"
          align="end"
          width="14rem"
          value={funnel?.id}
          onChange={onFunnelChange}
          options={funnels.map((item) => ({
            value: item.id,
            label: item.name,
            leading: <IconTile icon={item.icon} tone={item.tone} size="sm" />,
          }))}
          trigger={({ open: _open, ...props }) => (
            <Trigger type="button" {...props}>
              {funnel && <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />}
              {funnel?.name}
              <CaretDownIcon size={12} weight="bold" aria-hidden />
            </Trigger>
          )}
        />
      </CardHead>

      {!funnel || stages.length === 0 ? (
        <EmptyNote>Este funil não tem etapas.</EmptyNote>
      ) : (
        <>
          <Stack role="img" aria-label={`Divisão do valor entre as etapas do funil ${funnel.name}`} onPointerLeave={() => setHover(null)}>
            {stages
              .filter((stage) => stage.value > 0)
              .map((stage) => (
                <Piece
                  key={stage.id}
                  $color={color(stage.id)}
                  $dim={hover !== null && hover !== stage.id}
                  style={{ flexGrow: stage.value }}
                  onPointerEnter={() => setHover(stage.id)}
                />
              ))}
            {total === 0 && <Piece $color={theme.palette.neutral[100]} $dim={false} style={{ flexGrow: 1 }} />}
          </Stack>

          <Rows onPointerLeave={() => setHover(null)}>
            {stages.map((stage) => (
              <Row key={stage.id} $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                <span>
                  <Dot $color={color(stage.id)} aria-hidden />
                  {stage.label}
                </span>
                <small>
                  {stage.count} {stage.count === 1 ? "lead" : "leads"}
                </small>
                <strong>{formatMoney(stage.value)}</strong>
                <em>{total ? Math.round((stage.value / total) * 100) : 0}%</em>
              </Row>
            ))}
          </Rows>
        </>
      )}
    </Card>
  );
}
