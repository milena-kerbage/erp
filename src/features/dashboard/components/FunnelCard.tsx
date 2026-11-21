"use client";

import { useState } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { CaretDownIcon } from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { transientOptions } from "@/lib/emotion/transient";
import { stageIcon, type Funnel } from "@/features/leads/funnels";
import { formatMoney, wholeShares, type StageValue } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

/* ---------- Estilos ---------- */

// Altura mínima de cada etapa. As duas colunas (números | funil) usam a mesma grade de linhas iguais e esticam juntas
// até o fim do cartão: cada linha de números fecha exatamente com a sua gaveta, sem sobra nem falta.
const ALTURA = 3.75; // rem
const linhasIguais = `display: grid; grid-auto-rows: minmax(${ALTURA}rem, 1fr);`;

/** Duas colunas: os números de cada etapa e, ao lado, o funil desenhado. */
const Grade = styled.div`
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.9fr);
  gap: ${({ theme }) => theme.spacing(5)};
  align-items: stretch;

  @container (max-width: 460px) {
    grid-template-columns: minmax(0, 1fr) 8.5rem;
    gap: ${({ theme }) => theme.spacing(3)};
  }
`;

const Numeros = styled.ul`
  ${linhasIguais}
`;

const Linha = styled("li", transientOptions)<{ $dim: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  align-items: center;
  min-height: 0;
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

/** O funil: o desenho em SVG por trás (uma gaveta por etapa) e, por cima, o ícone e o nome da etapa. */
const Funil = styled.div`
  position: relative;
  ${linhasIguais}

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
  gap: 3px;
  min-height: 0;
  /* Um respiro em cima: a aba da gaveta anterior entra aqui */
  padding: 5px 20% 0;
  color: ${({ $cor }) => $cor};
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.15;
  text-align: center;
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  transition: opacity 200ms;

  span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
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
 * Funil desenhado: à esquerda os números de cada etapa (leads e valor) e, ao lado, o funil em gavetas: o tom pastel
 * da etapa, o ícone e o nome no tom escuro dela, e a aba que encaixa no recorte da gaveta de baixo.
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
  // As partes de cada coluna somam exatamente 100%.
  const partesDosLeads = wholeShares(stages.map((stage) => stage.count)), partesDoValor = wholeShares(stages.map((stage) => stage.value));
  // Gaveta do funil em tom pastel: o destaque suave da etapa com um sopro do tom escuro, que é a cor do ícone e do
  // nome (contraste AA). No tema escuro, o destaque e o texto claro do mesmo tom.
  const cheia = (id: string) => (theme.mode === "dark" ? tom(id).soft : `color-mix(in srgb, ${tom(id).fg} 10%, ${tom(id).soft})`);
  const sobre = (id: string) => tom(id).fg;
  // Desenho: 100 de largura; cada etapa ocupa 100 de altura. O funil afunila até 56% da largura. Cada gaveta desce
  // numa aba em triângulo, e o contorno na cor do cartão abre o recorte onde ela encaixa na gaveta de baixo.
  const n = Math.max(stages.length, 1), recuo = 22 / n, ABA = { meia: 7, altura: 12 };
  const gaveta = (indice: number) => {
    const cima = indice * recuo, baixo = (indice + 1) * recuo, y0 = indice * 100, y1 = (indice + 1) * 100;
    const aba = indice < n - 1 ? ` L${50 + ABA.meia} ${y1} L50 ${y1 + ABA.altura} L${50 - ABA.meia} ${y1}` : "";
    return `M${cima} ${y0} L${100 - cima} ${y0} L${100 - baixo} ${y1}${aba} L${baixo} ${y1} Z`;
  };

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
                  <em>{count > 0 ? `${partesDosLeads[indice]}%` : "–"} do funil</em>
                </div>
                <div>
                  <small>Valor</small>
                  <strong>{formatMoney(stage.value)}</strong>
                  <em>{total > 0 ? `${partesDoValor[indice]}%` : "–"} do valor</em>
                </div>
              </Linha>
            ))}
          </Numeros>

          <Funil role="img" aria-label={`Funil ${funnel.name}: ${stages.map((stage) => `${stage.label}, ${stage.count}`).join("; ")}`}>
            <svg viewBox={`0 0 100 ${n * 100}`} preserveAspectRatio="none" aria-hidden>
              {/* De baixo para cima: a aba de cada gaveta fica por cima da seguinte */}
              {stages.map((stage, indice) => ({ stage, indice })).reverse().map(({ stage, indice }) => (
                <path key={stage.id} d={gaveta(indice)} fill={cheia(stage.id)} stroke={theme.palette.neutral[0]} strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={hover !== null && hover !== stage.id ? 0.55 : 1} />
              ))}
            </svg>
            {stages.map((stage) => {
              const Icone = stageIcon(etapa(stage.id) ?? { label: stage.label });
              return (
                <Etapa key={stage.id} $cor={sobre(stage.id)} $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                  <Icone size={17} weight="fill" aria-hidden />
                  <span>{stage.label}</span>
                </Etapa>
              );
            })}
          </Funil>
        </Grade>
      )}
    </Card>
  );
}
