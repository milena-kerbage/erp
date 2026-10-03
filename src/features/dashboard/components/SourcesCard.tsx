"use client";

import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { ChartPieSliceIcon, DotsThreeCircleIcon } from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import { findChoice, leadSources } from "@/features/leads/options";
import { formatMoney, formatMoneyShort, type SourceRow } from "../metrics";
import { MAX_SLICES, otherColor, sourceColor } from "../palette";
import { Gauge } from "./charts";
import { Card, CardHead, EmptyNote } from "./ui";

/* ---------- Estilos ---------- */

const Root = styled(Card)`
  gap: 0;
  padding: 0;
  overflow: hidden;
`;

const Top = styled.div`
  padding: ${({ theme }) => theme.spacing(5, 5, 0)};
`;

const GaugeArea = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(5, 5, 6)};
`;

/** Uma coluna por canal, com divisórias, como a referência. */
const Columns = styled.ul`
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  > li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1)};
    min-width: 0;
    padding: ${({ theme }) => theme.spacing(4, 3)};
    text-align: center;
  }

  > li + li {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`;

const Badge = styled("span", transientOptions)<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  margin-bottom: ${({ theme }) => theme.spacing(1.5)};
  border: 1px solid ${({ $color }) => `${$color}33`};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ $color }) => `${$color}1a`};
  color: ${({ $color }) => $color};
`;

const Name = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing(1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Value = styled.strong`
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`;

const Small = styled.small`
  font-size: 0.6875rem;
  line-height: 1.35;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};
`;

type Part = { id: string; label: string; count: number; value: number; color: string; other: boolean };

/* ---------- Componente ---------- */

/**
 * De onde veio o valor dos orçamentos do mês: medidor em tracinhos com o
 * total no meio e, embaixo, uma coluna por canal (parte, valor, leads e ticket).
 */
export function SourcesCard({ rows }: { rows: SourceRow[] }) {
  const theme = useTheme();
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  // Até três canais com cor própria (pelo valor); o resto vira "Outras"
  const ranked = [...rows].sort((a, b) => b.value - a.value);
  const main = ranked.slice(0, MAX_SLICES);
  const rest = ranked.slice(MAX_SLICES);
  const parts: Part[] = [
    ...main.map((row) => ({
      id: row.source,
      label: row.source,
      count: row.count,
      value: row.value,
      color: sourceColor(row.source, theme.mode),
      other: false,
    })),
    ...(rest.length
      ? [
          {
            id: "__other__",
            label: rest.length === 1 ? rest[0].source : "Outras",
            count: rest.reduce((sum, row) => sum + row.count, 0),
            value: rest.reduce((sum, row) => sum + row.value, 0),
            color: otherColor(theme.mode),
            other: rest.length > 1,
          },
        ]
      : []),
  ];

  return (
    <Root aria-label="Vendas por origem">
      <Top>
        <CardHead
          title="Vendas por origem"
          subtitle="Participação no valor dos orçamentos do mês"
          icon={ChartPieSliceIcon}
          tone="teal"
        />
      </Top>

      {total === 0 ? (
        <EmptyNote>Nenhum orçamento chegou neste mês ainda.</EmptyNote>
      ) : (
        <>
          <GaugeArea>
            <Gauge
              label="Valor dos orçamentos do mês por origem"
              parts={parts.map((part) => ({ id: part.id, label: part.label, value: part.value, color: part.color }))}
              total={formatMoneyShort(total)}
              format={formatMoney}
            />
          </GaugeArea>
          <Columns>
            {parts.map((part) => {
              const option = part.other ? undefined : findChoice(leadSources, part.label);
              const Icon = option?.icon ?? DotsThreeCircleIcon;
              return (
                <li key={part.id}>
                  <Badge $color={part.color} aria-hidden>
                    <Icon size={15} weight="bold" />
                  </Badge>
                  <Name>
                    {part.label}
                    <strong>{Math.round((part.value / total) * 100)}%</strong>
                  </Name>
                  <Value>{formatMoney(part.value)}</Value>
                  <Small>
                    {part.count} {part.count === 1 ? "lead" : "leads"}
                  </Small>
                  <Small>ticket {formatMoneyShort(part.value / (part.count || 1))}</Small>
                </li>
              );
            })}
          </Columns>
        </>
      )}
    </Root>
  );
}
