"use client";

import { useState } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { CaretDownIcon } from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { transientOptions } from "@/lib/emotion/transient";
import { stageIcon, type Funnel } from "@/features/leads/funnels";
import { formatMoney, type StageValue } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

/* ---------- Estilos ---------- */

// Altura de cada etapa: a mesma nas três colunas (números | funil | taxas), para tudo se alinhar.
const ALTURA = 3.5; // rem

/** Três colunas: os números de cada etapa, o funil desenhado e as taxas de conversão entre as etapas. */
const Grade = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11.5rem 9.5rem;
  gap: ${({ theme }) => theme.spacing(4)};
  align-items: start;

  @container (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr) 9rem 8.5rem;
    gap: ${({ theme }) => theme.spacing(2.5)};
  }
  /* Bem estreito (celular): só os números e o funil */
  @container (max-width: 460px) {
    grid-template-columns: minmax(0, 1fr) 8rem;
    > [data-taxas] { display: none; }
  }
`;

const Numeros = styled.ul`
  display: flex;
  flex-direction: column;
`;

const Linha = styled("li", transientOptions)<{ $dim: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  align-items: center;
  height: ${ALTURA}rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  transition: opacity 200ms;

  &:last-of-type { border-bottom: 0; }

  > div { display: flex; flex-direction: column; min-width: 0; padding: ${({ theme }) => theme.spacing(0, 3)}; line-height: 1.2; }
  > div:first-of-type { padding-left: 0; }
  > div + div { border-left: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  strong { font-size: 1rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.01em; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
  em { overflow: hidden; font-size: 0.6875rem; font-style: normal; color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap; text-overflow: ellipsis; }

  @container (max-width: 560px) {
    > div { padding: ${({ theme }) => theme.spacing(0, 2)}; }
  }
`;

/** O funil: o desenho em SVG por trás (trapézios de cantos arredondados) e, por cima, o ícone e o nome da etapa. */
const Funil = styled.div`
  position: relative;

  > svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  path {
    transition: opacity 200ms;
  }
`;

const Etapa = styled("div", transientOptions)<{ $cor: string; $dim: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: ${ALTURA}rem;
  padding: 0 22%;
  color: ${({ $cor }) => $cor};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.15;
  text-align: center;
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  transition: opacity 200ms;

  span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
`;

/** Taxas de conversão: uma seta curva de uma etapa para a seguinte, com a taxa ao lado. */
const Taxas = styled.div`
  position: relative;
`;

const Passo = styled("div", transientOptions)<{ $topo: number; $cor: string; $dim: boolean }>`
  position: absolute;
  top: ${({ $topo }) => $topo}rem;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: ${ALTURA}rem;
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  transition: opacity 200ms;

  > svg { flex-shrink: 0; width: 1.375rem; height: 100%; overflow: visible; color: ${({ $cor }) => $cor}; }
  > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; line-height: 1.2; }
  small { overflow: hidden; font-size: 0.625rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  strong { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.01em; color: ${({ $cor }) => $cor}; }
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

const porcento = (parte: number, todo: number) => (todo > 0 ? `${Math.round((parte / todo) * 100)}%` : "–");

/**
 * Funil desenhado: à esquerda os números de cada etapa (leads, valor e quantos chegaram até ali), no meio o funil
 * com o ícone e o nome de cada etapa em tons pastel, e à direita a taxa de conversão de uma etapa para a seguinte.
 * Um lead "chegou" a uma etapa quando está nela ou em alguma depois: é sobre isso que as taxas são calculadas.
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
  const etapa = (id: string) => funnel?.stages.find((stage) => stage.id === id);
  const tom = (id: string) => theme.tones[etapa(id)?.tone ?? "neutral"];
  // Quantos chegaram até cada etapa (estão nela ou em alguma depois).
  const chegaram = stages.map((_, indice) => stages.slice(indice).reduce((sum, stage) => sum + stage.count, 0));
  // Desenho do funil: 100 de largura; cada etapa ocupa 100 de altura, com uma fresta entre elas. Termina com 56%.
  const n = Math.max(stages.length, 1), FRESTA = 5, recuo = 22 / n;

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
        <Grade onPointerLeave={() => setHover(null)}>
          <Numeros aria-label="Leads e valor por etapa">
            {stages.map((stage, indice) => (
              <Linha key={stage.id} $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                <div>
                  <small>Leads</small>
                  <strong>{stage.count}</strong>
                  <em>{porcento(stage.count, count)} do funil</em>
                </div>
                <div>
                  <small>Valor</small>
                  <strong>{formatMoney(stage.value)}</strong>
                  <em>{porcento(stage.value, total)} do valor</em>
                </div>
              </Linha>
            ))}
          </Numeros>

          <Funil role="img" aria-label={`Funil ${funnel.name}: ${stages.map((stage) => `${stage.label}, ${stage.count}`).join("; ")}`}>
            <svg viewBox={`0 0 100 ${n * 100}`} preserveAspectRatio="none" aria-hidden>
              {stages.map((stage, indice) => {
                const cima = indice * recuo, baixo = (indice + 1) * recuo, y0 = indice * 100 + FRESTA, y1 = (indice + 1) * 100 - FRESTA;
                // O contorno na mesma cor, com as junções arredondadas, é o que arredonda os cantos do trapézio.
                return (
                  <path key={stage.id} d={`M${cima + 2} ${y0} L${100 - cima - 2} ${y0} L${100 - baixo - 2} ${y1} L${baixo + 2} ${y1} Z`} fill={tom(stage.id).soft} stroke={tom(stage.id).soft} strokeWidth="9" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                    opacity={hover !== null && hover !== stage.id ? 0.45 : 1} />
                );
              })}
            </svg>
            {stages.map((stage) => {
              const Icone = stageIcon(etapa(stage.id) ?? { label: stage.label });
              return (
                <Etapa key={stage.id} $cor={tom(stage.id).fg} $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                  <Icone size={15} weight="duotone" aria-hidden />
                  <span>{stage.label}</span>
                </Etapa>
              );
            })}
          </Funil>

          <Taxas data-taxas style={{ height: `${stages.length * ALTURA}rem` }} aria-label="Taxas de conversão entre as etapas">
            {stages.slice(1).map((stage, indice) => (
              <Passo key={stage.id} $topo={indice * ALTURA + ALTURA / 2} $cor={tom(stage.id).fg} $dim={hover !== null && hover !== stage.id && hover !== stages[indice].id}>
                {/* Seta curva: sai do meio de uma etapa, contorna e chega no meio da seguinte */}
                <svg viewBox="0 0 28 72" preserveAspectRatio="none" fill="none" aria-hidden>
                  <path d="M1 2 H12 C20 2 24 8 24 16 V56 C24 64 20 70 12 70 H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" vectorEffect="non-scaling-stroke" />
                  <path d="M9 65.5 L4 70 L9 74.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div>
                  <small title={`${stages[indice].label} → ${stage.label}`}>{stages[indice].label} → {stage.label}</small>
                  <strong>{porcento(chegaram[indice + 1], chegaram[indice])}</strong>
                </div>
              </Passo>
            ))}
          </Taxas>
        </Grade>
      )}
    </Card>
  );
}
