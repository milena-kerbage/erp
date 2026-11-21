"use client";

import type { ReactNode } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { Pie, PieChart } from "recharts";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { transientOptions } from "@/lib/emotion/transient";

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

/* ---------- Linha de tendência ---------- */

/**
 * Linha fina com a área embaixo (um ponto por dia): mostra o ritmo sem eixos nem números. `values` com null corta a
 * linha (dias que ainda não chegaram).
 */
export function Sparkline({ values, color, label, height = 28 }: { values: (number | null)[]; color: string; label: string; height?: number }) {
  const pontos = values.map((valor, indice) => ({ valor, indice })).filter((ponto): ponto is { valor: number; indice: number } => ponto.valor !== null);
  if (pontos.length < 2) return <svg role="img" aria-label={label} width="100%" height={height} />;
  const maximo = Math.max(...pontos.map((ponto) => ponto.valor), 1);
  const x = (indice: number) => (indice / Math.max(values.length - 1, 1)) * 100;
  const y = (valor: number) => height - 3 - (valor / maximo) * (height - 8);
  // Curva suave: cada trecho passa pelo meio entre dois pontos.
  const linha = pontos.map((ponto, i) => {
    if (i === 0) return `M${x(ponto.indice)} ${y(ponto.valor)}`;
    const anterior = pontos[i - 1], meio = (x(anterior.indice) + x(ponto.indice)) / 2;
    return `C${meio} ${y(anterior.valor)} ${meio} ${y(ponto.valor)} ${x(ponto.indice)} ${y(ponto.valor)}`;
  }).join(" ");
  const ultimo = pontos[pontos.length - 1];
  const id = `tendencia-${label.replace(/\W+/g, "-")}`;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linha} L${x(ultimo.indice)} ${height} L${x(pontos[0].indice)} ${height} Z`} fill={`url(#${id})`} />
      <path d={linha} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- Barras do mês ---------- */

const BarrasRoot = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 2.75rem;
`;

const Barra = styled("span", transientOptions)<{ $altura: number; $cor: string; $estado: "passado" | "hoje" | "futuro" }>`
  flex: 1;
  min-width: 2px;
  height: ${({ $altura, $estado }) => ($estado === "futuro" ? "3px" : `max(3px, ${$altura}%)`)};
  border-radius: 3px 3px 1px 1px;
  background-color: ${({ $cor, $estado, theme }) => ($estado === "futuro" ? theme.palette.neutral[100] : $cor)};
  opacity: ${({ $estado }) => ($estado === "passado" ? 0.45 : 1)};
  transition: opacity 160ms, height 500ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    opacity: 1;
  }
`;

/** Uma barra por dia do mês: os dias que passaram, hoje em destaque e os que faltam só marcados. */
export function MonthBars({ days, color, format, label }: { days: { date: Date; value: number; count: number; future: boolean }[]; color: string; format: (value: number) => string; label: string }) {
  const maximo = Math.max(...days.map((dia) => dia.value), 1);
  const hoje = days.filter((dia) => !dia.future).length - 1;
  return (
    <BarrasRoot role="img" aria-label={label}>
      {days.map((dia, indice) => (
        <Barra key={indice} $altura={(dia.value / maximo) * 100} $cor={color} $estado={dia.future ? "futuro" : indice === hoje ? "hoje" : "passado"}
          title={dia.future ? `${dia.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : `${dia.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}: ${format(dia.value)} em ${dia.count} ${dia.count === 1 ? "lead" : "leads"}`} />
      ))}
    </BarrasRoot>
  );
}
