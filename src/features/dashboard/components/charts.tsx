"use client";

import type { ReactNode } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { Pie, PieChart } from "recharts";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";

/** Tabela equivalente, só para leitor de tela (o gráfico nunca é a única forma de ler). */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <VisuallyHidden as="div">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, position) => (
                <td key={position}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </VisuallyHidden>
  );
}

/* ---------- Medidor em meio-círculo ---------- */

export type GaugePart = { id: string; label: string; value: number; color: string };

const GaugeRoot = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const GaugeCenter = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;

  span {
    font-size: 0.625rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.text.muted};
    text-transform: uppercase;
  }

  strong {
    font-size: 1.375rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }
`;

/**
 * Meio-círculo feito de tracinhos (como a referência): cada parte pinta a sua
 * fatia na própria cor, na ordem da maior para a menor. Tracinhos de mesma
 * largura com folga entre eles: a separação é o espaço, não um contorno.
 */
export function Gauge({
  parts,
  total,
  caption = "Total",
  label,
  width = 260,
  ticks = 34,
  format = String,
}: {
  parts: GaugePart[];
  /** Texto do meio (ex.: "R$ 56,8 mil"). */
  total: ReactNode;
  caption?: string;
  label: string;
  width?: number;
  ticks?: number;
  /** Formato dos valores na tabela para leitor de tela. */
  format?: (value: number) => string;
}) {
  const theme = useTheme();
  const sum = parts.reduce((acc, part) => acc + part.value, 0);
  const height = width / 2 + 6;

  // Cada tracinho vai para a parte em que cai o seu centro
  const bounds = parts.reduce<{ part: GaugePart; end: number }[]>((list, part) => {
    const start = list.length ? list[list.length - 1].end : 0;
    return [...list, { part, end: start + (sum ? part.value / sum : 0) }];
  }, []);
  const data = Array.from({ length: ticks }, (_, index) => {
    const center = (index + 0.5) / ticks;
    const owner = bounds.find((bound) => center <= bound.end) ?? bounds[bounds.length - 1];
    return { id: index, value: 1, fill: sum && owner ? owner.part.color : theme.palette.neutral[100] };
  });

  return (
    <GaugeRoot style={{ width, height }}>
      <PieChart style={{ width, height }} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy={width / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={width / 2 - 26}
          outerRadius={width / 2 - 2}
          paddingAngle={2.4}
          cornerRadius={3}
          stroke="none"
          isAnimationActive
          animationDuration={900}
        />
      </PieChart>
      <GaugeCenter aria-hidden>
        <span>{caption}</span>
        <strong>{total}</strong>
      </GaugeCenter>
      <DataTable
        caption={label}
        head={["Parte", "Valor", "Participação"]}
        rows={parts.map((part) => [part.label, format(part.value), `${Math.round((part.value / (sum || 1)) * 100)}%`])}
      />
    </GaugeRoot>
  );
}
