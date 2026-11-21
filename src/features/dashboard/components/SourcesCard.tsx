"use client";

import Link from "next/link";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { ChartPieSliceIcon, DotsThreeCircleIcon } from "@phosphor-icons/react";
import { logoDaOrigem } from "@/components/brand/LogosOrigem";
import { Tooltip } from "@/components/ui/Tooltip";
import { transientOptions } from "@/lib/emotion/transient";
import { findChoice, leadSources } from "@/features/leads/options";
import { leadsHref, origensDoCanal } from "../links";
import { formatMoney, formatMoneyShort, joinSources, type SourceRow } from "../metrics";
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

/** O medidor leva para os leads que entraram no período. */
const GaugeArea = styled(Link)`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(5, 5, 6)};
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover, &:focus-visible { background-color: ${({ theme }) => theme.palette.neutral[25]}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: -2px; }
`;

/** Uma coluna por canal, com divisórias, como a referência. */
const Columns = styled.ul`
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  > li {
    display: grid;
    min-width: 0;
  }
  > li > span {
    display: grid;
    min-width: 0;
  }

  /* O canal inteiro reage ao mouse: leads e ticket médio aparecem na dica */
  .canal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1)};
    height: 100%;
    padding: ${({ theme }) => theme.spacing(3.5, 1.5)};
    color: inherit;
    text-align: center;
    text-decoration: none;
    transition: background-color 0.2s ease;
  }
  .canal:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: -2px;
  }
  .canal:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }
  .canal:hover .logo {
    transform: translateY(-1px) scale(1.06);
  }
  .logo {
    display: grid;
    place-items: center;
    height: 1.875rem;
    margin-bottom: ${({ theme }) => theme.spacing(1.5)};
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .canal:hover .logo { transform: none; }
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
  border: 1px solid ${({ $color }) => `${$color}33`};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ $color }) => `${$color}1a`};
  color: ${({ $color }) => $color};
`;

const Name = styled.span`
  max-width: 100%;
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Value = styled.strong`
  font-size: 1rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`;

/** Conteúdo da dica do canal: nome em cima e os números em duas colunas. */
const Dica = styled.div`
  display: grid;
  gap: 6px;
  min-width: 10.5rem;
  padding: 2px 0;
  text-align: left;

  strong { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; margin: 0; }
  dt { opacity: 0.72; font-weight: ${({ theme }) => theme.fontWeights.regular ?? 400}; }
  dd { margin: 0; font-weight: ${({ theme }) => theme.fontWeights.semibold}; text-align: right; }
`;

/** Valor curto para caber sem quebrar: 31.239 → "R$ 31K"; abaixo de mil, o valor inteiro. */
const valorCurto = (valor: number) => (valor >= 1000 ? `R$ ${Math.round(valor / 1000).toLocaleString("pt-BR")}K` : formatMoney(Math.round(valor)));

type Part = { id: string; label: string; count: number; value: number; color: string; other: boolean; sources: string[] };

/* ---------- Componente ---------- */

/**
 * De onde veio o valor dos orçamentos do mês: medidor em tracinhos com o
 * total no meio e, embaixo, uma coluna por canal com a logo dele, o nome e o valor. Leads, ticket médio e a parte do
 * valor aparecem na dica, ao passar o mouse.
 */
export function SourcesCard({ rows }: { rows: SourceRow[] }) {
  const theme = useTheme();
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  // Até três canais com cor própria (pelo valor); o resto vira "Outros"
  const ranked = joinSources(rows).sort((a, b) => b.value - a.value);
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
      sources: origensDoCanal(row.source),
    })),
    ...(rest.length
      ? [
          {
            id: "__other__",
            label: rest.length === 1 ? rest[0].source : "Outros",
            count: rest.reduce((sum, row) => sum + row.count, 0),
            value: rest.reduce((sum, row) => sum + row.value, 0),
            color: otherColor(theme.mode),
            other: rest.length > 1,
            sources: rest.flatMap((row) => origensDoCanal(row.source)),
          },
        ]
      : []),
  ];

  return (
    <Root aria-label="Vendas por origem">
      <Top>
        <CardHead
          title="Vendas por origem"
          icon={ChartPieSliceIcon}
          tone="teal"
        />
      </Top>

      {total === 0 ? (
        <EmptyNote>Nenhum orçamento chegou neste mês ainda.</EmptyNote>
      ) : (
        <>
          <GaugeArea href={leadsHref({ criados: 30 })} aria-label="Abrir os leads dos últimos 30 dias">
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
              const logo = part.other ? null : logoDaOrigem(part.label, 26);
              const parte = Math.round((part.value / total) * 100);
              return (
                <li key={part.id}>
                  <Tooltip
                    side="top"
                    delay={120}
                    label={
                      <Dica>
                        <strong>{part.label}</strong>
                        <dl>
                          <dt>Leads no mês</dt>
                          <dd>{part.count}</dd>
                          <dt>Ticket médio</dt>
                          <dd>{formatMoney(Math.round(part.value / (part.count || 1)))}</dd>
                          <dt>Parte do valor</dt>
                          <dd>{parte}%</dd>
                        </dl>
                      </Dica>
                    }
                  >
                    <Link className="canal" href={leadsHref({ origens: part.sources, criados: 30 })} aria-label={`${part.label}: ${parte}% do valor, ${formatMoney(part.value)}, ${part.count} ${part.count === 1 ? "lead" : "leads"}, ticket médio ${formatMoney(Math.round(part.value / (part.count || 1)))}`}>
                      <span className="logo" aria-hidden>
                        {logo ?? (
                          <Badge $color={part.color}>
                            <Icon size={15} weight="bold" />
                          </Badge>
                        )}
                      </span>
                      <Name>{part.label}</Name>
                      <Value>{valorCurto(part.value)}</Value>
                    </Link>
                  </Tooltip>
                </li>
              );
            })}
          </Columns>
        </>
      )}
    </Root>
  );
}
