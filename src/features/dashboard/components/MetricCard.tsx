"use client";

import type { ReactNode } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import { Sparkline } from "./charts";
import { CardLink, Delta } from "./ui";

/* O cartão de indicador do Painel e do painel do E-commerce: só o título, o número e uma leitura (a linha de
   tendência ou uma barra lisa). O cartão inteiro leva para a lista com o recorte daquele número. */

const MetricRoot = styled(CardLink)`
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 7rem;
  padding: ${({ theme }) => theme.spacing(3.5, 4, 0)};
  overflow: hidden;
`;

const MetricTitle = styled.span`
  overflow: hidden;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** Gráfico do indicador: encosta nas duas bordas e no pé do cartão (100% da largura). */
const MetricChart = styled.div`
  margin: auto -${({ theme }) => theme.spacing(4)} 0;
`;

/** Barra de progresso do indicador, no pé do cartão. */
/** Barra lisa e fina: a parte preenchida na cor do indicador, sobre um trilho neutro. */
const MetricBar = styled("div", transientOptions)<{ $parte: number; $cor: string }>`
  margin-top: auto;
  padding-bottom: ${({ theme }) => theme.spacing(4)};

  span {
    display: block;
    height: 0.25rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.palette.neutral[100]};
    overflow: hidden;
  }
  span::after {
    content: "";
    display: block;
    width: ${({ $parte }) => Math.min(100, Math.max(0, $parte))}%;
    min-width: ${({ $parte }) => ($parte > 0 ? "0.25rem" : "0")};
    height: 100%;
    border-radius: inherit;
    background: ${({ $cor }) => $cor};
    transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

/** Linhas pequenas com barra (ticket por origem). */

const FigureRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(1, 2)};
`;

/** Número principal dos indicadores: grande, com a unidade ao lado. */
const BigFigure = styled.strong`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing(0, 2)};
  min-width: 0;
  font-size: clamp(1.25rem, 10cqi, 1.625rem);
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1.1;
  white-space: nowrap;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};

  small {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/**
 * Indicador objetivo, sempre da mesma altura: o nome, o número (com o crescimento ao lado, quando compara) e UMA
 * leitura visual embaixo: a linha de tendência, de ponta a ponta do cartão, ou a barra de progresso.
 */
export function MetricCard({
  title,
  href,
  tone,
  value,
  unit,
  ratio,
  delta,
  deltaVersus,
  upIsGood,
  series,
}: {
  title: string;
  /** Para onde o cartão leva: a lista com o recorte deste número. */
  href: string;
  tone: Tone;
  value: ReactNode;
  unit?: string;
  ratio?: number;
  /** Variação contra o mesmo trecho do mês passado (undefined = este indicador não compara). */
  delta?: number | null;
  deltaVersus?: string;
  upIsGood?: boolean;
  /** Um ponto por dia do mês: vira a linha de tendência no lugar da barra. */
  series?: (number | null)[];
}) {
  const theme = useTheme();
  return (
    <MetricRoot href={href} aria-label={`${title}: abrir a lista`}>
      <MetricTitle>{title}</MetricTitle>
      <FigureRow>
        <BigFigure>
          {value}
          {unit && <small>{unit}</small>}
        </BigFigure>
        {/* Crescimento ao lado do número (o período comparado fica na dica) */}
        {delta !== undefined && delta !== null && <span title={deltaVersus}><Delta value={delta} upIsGood={upIsGood} /></span>}
      </FigureRow>
      {series ? (
        <MetricChart>
          <Sparkline values={series} color={theme.tones[tone].fg} label={`${title} por dia no mês`} height={34} />
        </MetricChart>
      ) : (
        <MetricBar $parte={(ratio ?? 0) * 100} $cor={theme.mode === "dark" ? theme.tones[tone].fg : `color-mix(in srgb, ${theme.tones[tone].fg} 60%, ${theme.tones[tone].soft})`}>
          <span role="img" aria-label={`${Math.round((ratio ?? 0) * 100)}%`} />
        </MetricBar>
      )}
    </MetricRoot>
  );
}
