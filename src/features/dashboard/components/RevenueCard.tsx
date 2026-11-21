"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { parseDateOnly } from "@/lib/format";
import { leadsHref } from "../links";
import { change, formatMoney } from "../metrics";
import { Card, CardHead, Delta, EmptyNote } from "./ui";
import { useTamanho } from "./useTamanho";

/* ---------- Estilos ---------- */

const Root = styled(Card)`
  flex: 1 1 auto;
  gap: ${({ theme }) => theme.spacing(3.5)};
`;

/** O número do mês passado, grande, com o mês ao lado e o crescimento sobre o anterior. */
const Destaque = styled(Link)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1, 2)};
  margin: -4px -6px;
  padding: 4px 6px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: inherit;
  text-decoration: none;
  transition: background-color 160ms;

  &:hover, &:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .valor { display: inline-flex; align-items: baseline; gap: ${({ theme }) => theme.spacing(1.5)}; }
  .valor > strong { font-size: 1.625rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: -0.03em; line-height: 1.1; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
  .valor > small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
`;

/** Área do gráfico: o desenho em SVG, por cima as colunas clicáveis (uma por mês) e a dica do mês em foco. */
const Grafico = styled.div`
  position: relative;
  flex: 1;
  min-height: 7.5rem;

  > svg { position: absolute; inset: 0; display: block; overflow: visible; }
  text { font-size: 10px; fill: ${({ theme }) => theme.colors.text.muted}; }
  text[data-forte] { font-weight: 600; fill: ${({ theme }) => theme.colors.text.primary}; }
  > a { position: absolute; top: 0; bottom: 0; border-radius: ${({ theme }) => theme.radii.sm}; }
  > a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: -2px; }
`;

const Dica = styled.div`
  position: absolute;
  z-index: 1;
  display: grid;
  gap: 2px;
  min-width: 8.5rem;
  padding: ${({ theme }) => theme.spacing(2, 2.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.palette.neutral[0]};
  box-shadow: 0 6px 20px rgb(29 31 27 / 0.1);
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  pointer-events: none;
  transform: translate(-50%, -100%);

  b { display: block; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.secondary}; }
  b::first-letter { text-transform: uppercase; }
  strong { font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
  span { white-space: nowrap; }
`;

/** A legenda das duas linhas, ao lado do título. */
const Legenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(1, 3)};
  padding-top: 3px;
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 0.5rem; height: 0.5rem; border-radius: 50%; }
`;

/** Três números do rodapé, com divisórias: o número em cima e o que ele é embaixo. */
const Rodape = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
  margin: 0;
  padding-top: ${({ theme }) => theme.spacing(3.5)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  div { display: flex; flex-direction: column-reverse; gap: 1px; min-width: 0; }
  dt { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  dd { margin: 0; overflow: hidden; font-size: 1rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: -0.02em; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
`;

/* ---------- Componente ---------- */

export type RevenueRow = { month: string; value: number; count: number; entered?: number };

const nomeDoMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short" });
/** "2026-10" → o dia 1 daquele mês, no fuso de quem vê. */
const mesDe = (chave: string) => parseDateOnly(`${chave}-01`);
const abreviado = (data: Date) => mesCurto.format(data).replace(".", "");
const curto = (valor: number) => (valor >= 1000 ? `${(Math.round(valor / 100) / 10).toLocaleString("pt-BR")}K` : String(Math.round(valor)));
const plural = (quantidade: number, um: string, varios: string) => `${quantidade} ${quantidade === 1 ? um : varios}`;

/** Teto "redondo" do eixo: 1, 2 ou 5 vezes uma potência de dez, logo acima do maior valor. */
function teto(maior: number) {
  if (maior <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(maior));
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((fator) => fator * base).find((valor) => valor >= maior) ?? 10 * base;
}

type Ponto = { x: number; y: number };
/** Um trecho suave entre dois pontos (curva que passa pelos pontos, sem ultrapassar muito). */
const trecho = (pontos: Ponto[], indice: number) => {
  const p0 = pontos[Math.max(0, indice - 1)], p1 = pontos[indice], p2 = pontos[indice + 1], p3 = pontos[Math.min(pontos.length - 1, indice + 2)];
  const t = 0.18;
  return `M${p1.x} ${p1.y} C${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t} ${p2.x} ${p2.y}`;
};
const curva = (pontos: Ponto[], ate = pontos.length - 1) => Array.from({ length: Math.max(0, ate) }, (_, indice) => trecho(pontos, indice)).join(" ");

/**
 * Faturamento mês a mês: o mês passado em destaque (com o crescimento sobre o anterior), a linha dos últimos seis
 * meses contra o que entrou em orçamentos (tracejada) e, no rodapé, as vendas e o ticket do mês passado e o mês atual
 * até hoje. O trecho do mês atual é tracejado: ele ainda está em andamento.
 */
export function RevenueCard({ rows = [] }: { rows?: RevenueRow[] }) {
  const theme = useTheme();
  const [area, { largura, altura }] = useTamanho<HTMLDivElement>();
  const [foco, setFoco] = useState<number | null>(null);
  const atual = rows[rows.length - 1], passado = rows[rows.length - 2], antes = rows[rows.length - 3];
  const semVendas = rows.every((row) => row.value === 0);
  const clientes = leadsHref({ categoria: "cliente" });

  // Desenho em pixels: os rótulos do eixo à esquerda, os meses embaixo.
  const M = { esquerda: 30, direita: 10, cima: 8, baixo: 20 };
  const maximo = teto(Math.max(...rows.map((row) => Math.max(row.value, row.entered ?? 0)), 1));
  const n = rows.length, passo = n > 1 ? (largura - M.esquerda - M.direita) / (n - 1) : 0;
  const x = (indice: number) => M.esquerda + indice * passo;
  const y = (valor: number) => M.cima + (1 - valor / maximo) * (altura - M.cima - M.baixo);
  const fechado = rows.map((row, indice) => ({ x: x(indice), y: y(row.value) }));
  const orcado = rows.map((row, indice) => ({ x: x(indice), y: y(row.entered ?? 0) }));
  const cor = theme.palette.sage[500], corSuave = theme.palette.sage[300];
  const emFoco = foco !== null ? rows[foco] : null;

  return (
    <Root aria-label="Faturamento mensal">
      <CardHead title="Faturamento mensal">
        <Legenda aria-hidden>
          <span><i style={{ background: cor }} />Fechado</span>
          <span><i style={{ background: corSuave }} />Orçado</span>
        </Legenda>
      </CardHead>
      {!passado || semVendas ? (
        <EmptyNote>Nenhuma venda fechada nos últimos seis meses.</EmptyNote>
      ) : (
        <>
          <Destaque href={clientes} aria-label={`Mês passado, ${nomeDoMes.format(mesDe(passado.month))}: ${formatMoney(passado.value)}. Abrir os clientes`}>
            <span className="valor">
              <strong>{formatMoney(passado.value)}</strong>
              <small>em {nomeDoMes.format(mesDe(passado.month))}</small>
            </span>
            <Delta value={change(passado.value, antes?.value || null)} empty="sem base" />
          </Destaque>

          <Grafico ref={area} onPointerLeave={() => setFoco(null)}>
            {largura > 0 && (
              <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Faturamento e orçamentos dos últimos seis meses">
                {[0, 0.5, 1].map((parte) => (
                  <g key={parte}>
                    <line x1={M.esquerda} x2={largura - M.direita} y1={Math.round(y(maximo * parte)) + 0.5} y2={Math.round(y(maximo * parte)) + 0.5} stroke={theme.colors.border.subtle} />
                    <text x={0} y={y(maximo * parte) + 3.5}>{curto(maximo * parte)}</text>
                  </g>
                ))}
                {foco !== null && <line x1={x(foco)} x2={x(foco)} y1={M.cima} y2={altura - M.baixo} stroke={theme.colors.border.default} strokeDasharray="3 3" />}
                <path d={curva(orcado)} fill="none" stroke={corSuave} strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />
                <path d={curva(fechado, n - 2)} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" />
                {n > 1 && <path d={trecho(fechado, n - 2)} fill="none" stroke={cor} strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />}
                {fechado.map((ponto, indice) => (
                  <circle key={rows[indice].month} cx={ponto.x} cy={ponto.y} r={foco === indice ? 4.5 : indice >= n - 2 ? 3.5 : 0} fill={indice === n - 1 ? theme.palette.neutral[0] : cor} stroke={indice === n - 1 ? cor : theme.palette.neutral[0]} strokeWidth={2} />
                ))}
                {rows.map((row, indice) => (
                  <text key={row.month} x={x(indice)} y={altura - 4} textAnchor={indice === 0 ? "start" : indice === n - 1 ? "end" : "middle"} data-forte={indice >= n - 2 || undefined}>
                    {abreviado(mesDe(row.month))}
                  </text>
                ))}
              </svg>
            )}
            {largura > 0 && rows.map((row, indice) => {
              const mes = mesDe(row.month);
              return (
                <Link
                  key={row.month}
                  href={clientes}
                  style={{ left: Math.max(0, x(indice) - passo / 2), width: passo }}
                  aria-label={`${nomeDoMes.format(mes)}: ${formatMoney(row.value)} fechados em ${plural(row.count, "venda", "vendas")}, ${formatMoney(row.entered ?? 0)} em orçamentos${indice === n - 1 ? " (mês em andamento)" : ""}. Abrir os clientes`}
                  onPointerEnter={() => setFoco(indice)}
                  onFocus={() => setFoco(indice)}
                  onBlur={() => setFoco(null)}
                />
              );
            })}
            {emFoco && foco !== null && (
              <Dica style={{ left: Math.min(Math.max(x(foco), 72), largura - 72), top: Math.max(fechado[foco].y - 10, 56) }}>
                <b>{nomeDoMes.format(mesDe(emFoco.month))}{foco === n - 1 ? " (até hoje)" : ""}</b>
                <strong>{formatMoney(emFoco.value)}</strong>
                <span>{plural(emFoco.count, "venda", "vendas")} · {formatMoney(emFoco.entered ?? 0)} orçados</span>
              </Dica>
            )}
          </Grafico>

          <Rodape>
            <div>
              <dt>vendas em {abreviado(mesDe(passado.month))}</dt>
              <dd>{passado.count}</dd>
            </div>
            <div>
              <dt>ticket médio</dt>
              <dd>{formatMoney(Math.round(passado.count ? passado.value / passado.count : 0))}</dd>
            </div>
            <div>
              <dt>{abreviado(mesDe(atual.month))} até hoje</dt>
              <dd>{formatMoney(atual.value)}</dd>
            </div>
          </Rodape>
        </>
      )}
    </Root>
  );
}
