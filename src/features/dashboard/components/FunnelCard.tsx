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
const ALTURA = 3.75; // rem

/** Três colunas: os números de cada etapa, o funil desenhado e as taxas de conversão entre as etapas. */
const Grade = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8.75rem 8.5rem;
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: start;

  /* Cartão largo: o funil e as taxas ganham espaço */
  @container (min-width: 640px) {
    grid-template-columns: minmax(0, 1fr) 11rem 10.5rem;
    gap: ${({ theme }) => theme.spacing(5)};
  }
  /* Cartão bem estreito (celular): só os números e o funil */
  @container (max-width: 400px) {
    grid-template-columns: minmax(0, 1fr) 7.5rem;
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
  gap: ${({ theme }) => theme.spacing(2)};
  height: ${ALTURA}rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};
  transition: opacity 180ms;

  &:last-of-type { border-bottom: 0; }

  > div { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  > div + div { padding-left: ${({ theme }) => theme.spacing(2)}; border-left: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  strong { font-size: 1rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.01em; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
  em { overflow: hidden; font-size: 0.625rem; font-style: normal; color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap; text-overflow: ellipsis; }
`;

/** O funil: um trapézio por etapa, cada um mais estreito que o de cima. */
const Funil = styled.div`
  display: flex;
  flex-direction: column;
`;

const Trapezio = styled("button", transientOptions)<{ $cor: string; $texto: string; $de: number; $ate: number; $dim: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: calc(${ALTURA}rem - 2px);
  margin-bottom: 2px;
  padding: 0 18%;
  background-color: ${({ $cor }) => $cor};
  color: ${({ $texto }) => $texto};
  clip-path: polygon(${({ $de }) => $de}% 0, ${({ $de }) => 100 - $de}% 0, ${({ $ate }) => 100 - $ate}% 100%, ${({ $ate }) => $ate}% 100%);
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.15;
  text-align: center;
  cursor: default;
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  transition: opacity 180ms, filter 180ms;

  &:hover { filter: brightness(1.06); }
  span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
`;

/** Taxas de conversão: um colchete entre cada par de etapas e, por fora, o do início ao fim. */
const Taxas = styled.div`
  position: relative;
`;

const Passo = styled("div", transientOptions)<{ $topo: number; $cor: string; $dim: boolean }>`
  position: absolute;
  top: ${({ $topo }) => $topo}rem;
  left: 0;
  right: 1.125rem;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: ${ALTURA}rem;
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  transition: opacity 180ms;

  /* O colchete: sai do meio de uma etapa e chega, com a seta, no meio da seguinte */
  &::before {
    content: "";
    flex-shrink: 0;
    align-self: stretch;
    width: 0.75rem;
    border: 1.5px solid ${({ $cor }) => $cor};
    border-left: 0;
    border-radius: 0 4px 4px 0;
  }
  &::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: -1px;
    border: 4.5px solid transparent;
    border-right-color: ${({ $cor }) => $cor};
    border-left: 0;
  }

  > div { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  small { overflow: hidden; font-size: 0.625rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  strong { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ $cor }) => $cor}; }
`;

const Total = styled("div", transientOptions)<{ $altura: number; $cor: string }>`
  position: absolute;
  top: ${ALTURA / 2}rem;
  right: 0;
  width: 0.625rem;
  height: ${({ $altura }) => $altura}rem;
  border: 1.5px solid ${({ $cor }) => $cor};
  border-left: 0;
  border-radius: 0 5px 5px 0;

  /* A linha de cima e a de baixo vão até o funil */
  &::before,
  &::after {
    content: "";
    position: absolute;
    right: 100%;
    width: 100vw;
    max-width: 9rem;
    border-top: 1.5px solid ${({ $cor }) => $cor};
    opacity: 0.35;
  }
  &::before { top: -1.5px; }
  &::after { bottom: -1.5px; }
`;

const Resumo = styled("p", transientOptions)<{ $cor: string }>`
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  strong { font-size: 1.0625rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ $cor }) => $cor}; }
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
 * Funil desenhado: à esquerda os números de cada etapa (leads e valor), no meio o funil com o ícone e o nome de cada
 * etapa, e à direita a taxa de conversão de uma etapa para a seguinte. Embaixo, a conversão do início ao fim.
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
  const color = (id: string) => theme.tones[etapa(id)?.tone ?? "neutral"].fg;
  // No tema escuro o tom "fg" é claro: o texto do trapézio usa o fundo escuro do mesmo tom.
  const textoSobre = (id: string) => (theme.mode === "dark" ? theme.tones[etapa(id)?.tone ?? "neutral"].bg : "#fff");
  // Quantos chegaram até cada etapa (estão nela ou em alguma depois).
  const chegaram = stages.map((_, indice) => stages.slice(indice).reduce((sum, stage) => sum + stage.count, 0));
  const estreita = 19 / Math.max(stages.length, 1); // o funil termina com 62% da largura
  const ultima = stages[stages.length - 1];

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
          <Grade onPointerLeave={() => setHover(null)}>
            <Numeros aria-label="Leads e valor por etapa">
              {stages.map((stage, indice) => (
                <Linha key={stage.id} $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                  <div>
                    <small>Leads</small>
                    <strong>{stage.count}</strong>
                    <em title="Leads que chegaram até esta etapa (estão nela ou em alguma depois)">{porcento(chegaram[indice], count)} chegaram</em>
                  </div>
                  <div>
                    <small>Valor</small>
                    <strong>{formatMoney(stage.value)}</strong>
                    <em>{porcento(stage.value, total)} do funil</em>
                  </div>
                </Linha>
              ))}
            </Numeros>

            <Funil role="img" aria-label={`Funil ${funnel.name}: ${stages.map((stage) => `${stage.label}, ${stage.count}`).join("; ")}`}>
              {stages.map((stage, indice) => {
                const Icone = stageIcon(etapa(stage.id) ?? { label: stage.label });
                return (
                  <Trapezio key={stage.id} type="button" tabIndex={-1} $cor={color(stage.id)} $texto={textoSobre(stage.id)} $de={indice * estreita} $ate={(indice + 1) * estreita}
                    $dim={hover !== null && hover !== stage.id} onPointerEnter={() => setHover(stage.id)}>
                    <Icone size={16} weight="fill" aria-hidden />
                    <span>{stage.label}</span>
                  </Trapezio>
                );
              })}
            </Funil>

            <Taxas data-taxas style={{ height: `${stages.length * ALTURA}rem` }} aria-label="Taxas de conversão entre as etapas">
              {stages.slice(1).map((stage, indice) => (
                <Passo key={stage.id} $topo={indice * ALTURA + ALTURA / 2} $cor={color(stage.id)} $dim={hover !== null && hover !== stage.id && hover !== stages[indice].id}>
                  <div>
                    <small title={`${stages[indice].label} → ${stage.label}`}>{stages[indice].label} → {stage.label}</small>
                    <strong>{porcento(chegaram[indice + 1], chegaram[indice])}</strong>
                  </div>
                </Passo>
              ))}
              {stages.length > 2 && <Total $altura={(stages.length - 1) * ALTURA} $cor={color(ultima.id)} aria-hidden />}
            </Taxas>
          </Grade>

          {stages.length > 1 && (
            <Resumo $cor={color(ultima.id)}>
              Conversão do início ao fim ({stages[0].label} → {ultima.label})
              <strong>{porcento(chegaram[chegaram.length - 1], chegaram[0])}</strong>
            </Resumo>
          )}
        </>
      )}
    </Card>
  );
}
