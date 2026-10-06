"use client";

import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { ArrowDownRightIcon, ArrowUpRightIcon, QuestionIcon, type Icon } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/Tooltip";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import { formatChange } from "../metrics";

/* ---------- Cartão ---------- */

/** Cartão branco da grade: borda fina, cantos suaves e respiro por dentro. */
export const Card = styled.section`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing(5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;

  @container (max-width: 320px) {
    flex-wrap: wrap;
  }

  > div:first-of-type {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  h3 {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2)};
    font-size: 0.9375rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Título + explicação à esquerda; ícone colorido ou ações à direita. */
export function CardHead({
  title,
  subtitle,
  icon,
  tone = "neutral",
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: Icon;
  tone?: Tone;
  /** Selo com a quantidade ao lado do título (ex.: "Atenção hoje 3"). */
  count?: number;
  children?: ReactNode;
}) {
  return (
    <Head>
      <div>
        <h3>
          {title}
          {count !== undefined && count > 0 && <CountBadge>{count}</CountBadge>}
        </h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children ?? (icon && <IconBadge icon={icon} tone={tone} />)}
    </Head>
  );
}

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.tones.blue.soft};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.tones.blue.fg};
`;

const Badge = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${({ theme, $tone }) => theme.tones[$tone].soft};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].bg};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
`;

/** Ícone num quadradinho tingido (identidade de cada indicador). */
export function IconBadge({ icon: IconComponent, tone }: { icon: Icon; tone: Tone }) {
  return (
    <Badge $tone={tone} aria-hidden>
      <IconComponent size={16} weight="bold" />
    </Badge>
  );
}

/** "?" com a explicação do indicador (no hover e no foco). */
export function Help({ children }: { children: string }) {
  return (
    <Tooltip label={children} side="top">
      <HelpButton type="button" aria-label={children}>
        <QuestionIcon size={13} aria-hidden />
      </HelpButton>
    </Tooltip>
  );
}

const HelpButton = styled.button`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.muted};
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }
`;

/* ---------- Tipografia ---------- */

/** Rótulo em caixa alta (título do cartão principal). */
export const Eyebrow = styled.span`
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
`;

/** Número de destaque dos indicadores. */
export const Figure = styled.strong`
  display: block;
  min-width: 0;
  font-size: clamp(1.25rem, 10cqi, 1.75rem);
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1.1;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: normal;
  overflow-wrap: anywhere;

  small {
    display: block;
    margin-top: ${({ theme }) => theme.spacing(1)};
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const Note = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.muted};

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/* ---------- Barra em blocos ---------- */

const SegmentsRoot = styled.span`
  display: flex;
  gap: 3px;
  width: 100%;
`;

const Segment = styled("span", transientOptions)<{ $color: string; $on: boolean; $delay: number }>`
  flex: 1;
  height: 0.5rem;
  border-radius: 2px;
  background-color: ${({ theme, $on, $color }) => ($on ? $color : theme.palette.neutral[100])};
  transition: background-color 320ms ease ${({ $delay }) => $delay}ms;
`;

/**
 * Barra de progresso em blocos (como a referência): a parte cheia na cor do
 * indicador. `ratio` de 0 a 1.
 */
export function Segments({ ratio, color, count = 24, label }: { ratio: number; color: string; count?: number; label: string }) {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * count);
  return (
    <SegmentsRoot role="img" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <Segment key={index} $color={color} $on={index < filled} $delay={index * 12} />
      ))}
    </SegmentsRoot>
  );
}

/* ---------- Variação ---------- */

const DeltaRoot = styled("span", transientOptions)<{ $tone: "good" | "bad" | "flat" }>`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  strong {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 1.25rem;
    padding: ${({ theme }) => theme.spacing(0, 1.5)};
    border-radius: ${({ theme }) => theme.radii.full};
    background-color: ${({ theme, $tone }) =>
      $tone === "good" ? theme.tones.green.soft : $tone === "bad" ? theme.tones.rose.soft : theme.tones.neutral.soft};
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme, $tone }) =>
      $tone === "good" ? theme.tones.green.fg : $tone === "bad" ? theme.tones.rose.fg : theme.colors.text.secondary};
  }
`;

/**
 * Variação contra o período anterior. Cor = direção × se subir é bom. Sempre
 * com sinal e seta, nunca só a cor.
 */
export function Delta({
  value,
  upIsGood = true,
  versus,
  empty = "sem comparação",
}: {
  value: number | null;
  upIsGood?: boolean;
  versus?: string;
  empty?: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <DeltaRoot $tone="flat">
        <strong>{empty}</strong>
      </DeltaRoot>
    );
  }
  const rounded = Math.round(value * 10) / 10;
  const tone = rounded === 0 ? "flat" : rounded > 0 === upIsGood ? "good" : "bad";
  return (
    <DeltaRoot $tone={tone}>
      <strong>
        {rounded > 0 ? (
          <ArrowUpRightIcon size={11} weight="bold" aria-hidden />
        ) : rounded < 0 ? (
          <ArrowDownRightIcon size={11} weight="bold" aria-hidden />
        ) : null}
        {formatChange(rounded)}
      </strong>
      {versus && <span>{versus}</span>}
    </DeltaRoot>
  );
}

/* ---------- Controles ---------- */

/** Chips de contexto do topo (data, hora, fuso). */
export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;

  svg {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Seletor em pílula (Hoje / Mês): o ativo fica preenchido. */
export const Segmented = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

export const SegmentedItem = styled("button", transientOptions)<{ $active: boolean }>`
  height: 1.625rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : "transparent")};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : theme.colors.text.secondary)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : theme.colors.text.primary)};
  }
`;

/** Estado vazio dentro de um cartão. */
export const EmptyNote = styled.p`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(6, 2)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
`;
