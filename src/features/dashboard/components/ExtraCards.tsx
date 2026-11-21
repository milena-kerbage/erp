"use client";

import Link from "next/link";
import styled from "@emotion/styled";
import { DotsThreeCircleIcon, SealCheckIcon } from "@phosphor-icons/react";
import { logoDaOrigem } from "@/components/brand/LogosOrigem";
import { Tooltip } from "@/components/ui/Tooltip";
import { quandoNasce } from "@/features/leads/bebe";
import { findChoice, leadSources } from "@/features/leads/options";
import { transientOptions } from "@/lib/emotion/transient";
import { parseDateOnly } from "@/lib/format";
import type { Tone } from "@/styles/theme";
import { change, formatMoney, joinSources, type SourceRow } from "../metrics";
import { Card, CardHead, Delta, EmptyNote } from "./ui";

/* Coluna de apoio do Painel: os bebês que estão para chegar (o prazo real de cada enxoval), o faturamento mês a mês
   e quanto cada canal converte. */

const plural = (quantidade: number, um: string, varios: string) => `${quantidade} ${quantidade === 1 ? um : varios}`;

/* ---------- Bebês chegando ---------- */

/** As três janelas do prazo, da mais urgente para a mais tranquila: a cor acompanha a urgência. */
const JANELAS: readonly { de: number; ate: number; rotulo: string; tom: Tone }[] = [
  { de: 0, ate: 30, rotulo: "até 30 dias", tom: "rose" },
  { de: 30, ate: 60, rotulo: "31 a 60", tom: "peach" },
  { de: 60, ate: 90, rotulo: "61 a 90", tom: "green" },
];

const janelaDe = (dias: number) => JANELAS.find((janela) => dias <= janela.ate) ?? JANELAS[JANELAS.length - 1];

/** Barra de 90 dias em três trechos: em cima a contagem de cada janela, no trilho um risco por bebê, embaixo a escala. */
const Prazo = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(1.5, 1)};

  .conta { display: flex; align-items: baseline; gap: ${({ theme }) => theme.spacing(1.5)}; min-width: 0; line-height: 1.1; }
  .conta strong { font-size: 1.25rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: -0.02em; color: ${({ theme }) => theme.colors.text.primary}; }
  .conta small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }

  .escala { grid-column: 1 / -1; display: flex; justify-content: space-between; font-size: 0.625rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;

const Trecho = styled("span", transientOptions)<{ $tom: Tone }>`
  position: relative;
  height: 0.875rem;
  border-radius: 3px;
  background: ${({ theme, $tom }) => theme.tones[$tom].soft};
  overflow: hidden;

  &[data-ponta="inicio"] { border-radius: 999px 3px 3px 999px; }
  &[data-ponta="fim"] { border-radius: 3px 999px 999px 3px; }

  i {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    margin-left: -1.5px;
    border-radius: 2px;
    background: ${({ theme, $tom }) => theme.tones[$tom].fg};
    opacity: 0.7;
    animation: risco-entra 500ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }
  @keyframes risco-entra { from { transform: scaleY(0); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { i { animation: none; } }
`;

const Bebes = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;

  a { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2.5)}; margin: 0 -${({ theme }) => theme.spacing(2)}; padding: ${({ theme }) => theme.spacing(1, 2)}; border-radius: ${({ theme }) => theme.radii.md}; color: inherit; text-decoration: none; transition: background-color 160ms; }
  a:hover, a:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .quem { display: flex; flex: 1; flex-direction: column; min-width: 0; line-height: 1.25; }
  .quem strong { overflow: hidden; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
  .quem small { display: flex; align-items: center; gap: 3px; min-width: 0; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; }
  .quem small > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .quem small > svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary.main}; }
`;

/** A data do nascimento como folhinha: dia grande e mês pequeno, na cor da janela. */
const Folhinha = styled("span", transientOptions)<{ $tom: Tone }>`
  display: grid;
  flex-shrink: 0;
  place-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $tom }) => theme.tones[$tom].bg};
  box-shadow: inset 0 0 0 1px ${({ theme, $tom }) => theme.tones[$tom].soft};
  color: ${({ theme, $tom }) => theme.tones[$tom].fg};
  line-height: 1;
  text-align: center;

  b { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.02em; }
  i { margin-top: 2px; font-size: 0.5625rem; font-style: normal; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: 0.06em; text-transform: uppercase; }
`;

/** Quanto falta: selo com um ponto na cor da janela. */
const Falta = styled("span", transientOptions)<{ $tom: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  height: 1.375rem;
  padding: 0 9px 0 7px;
  border-radius: 999px;
  background: ${({ theme, $tom }) => theme.tones[$tom].soft};
  color: ${({ theme, $tom }) => theme.tones[$tom].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;

  &::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
`;

export type Births = { d30: number; d60: number; d90: number; next: { id: string; name: string; baby: string; date: string; client: boolean }[]; marks?: number[] };

const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const DIA = 86_400_000;

/** Bebês que estão para chegar: é o prazo de verdade de cada enxoval. */
export function BirthsCard({ births }: { births: Births }) {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const contas = [births.d30, births.d60 - births.d30, births.d90 - births.d60];
  const marcas = births.marks ?? [];
  return (
    <Card aria-label="Bebês chegando">
      <CardHead title="Bebês chegando" subtitle={births.d90 ? `${plural(births.d90, "nascimento", "nascimentos")} em 90 dias` : "O prazo de cada enxoval"} />
      <Prazo role="img" aria-label={`Nascimentos previstos: ${JANELAS.map((janela, indice) => `${contas[indice]} ${janela.rotulo}`).join(", ")}`}>
        {JANELAS.map((janela, indice) => (
          <span className="conta" key={janela.ate}>
            <strong>{contas[indice]}</strong>
            <small>{janela.rotulo}</small>
          </span>
        ))}
        {JANELAS.map((janela, indice) => (
          <Trecho key={janela.ate} $tom={janela.tom} data-ponta={indice === 0 ? "inicio" : indice === JANELAS.length - 1 ? "fim" : undefined} aria-hidden>
            {marcas
              .filter((dias) => (indice === 0 ? dias <= janela.ate : dias > janela.de && dias <= janela.ate))
              .map((dias, posicao) => (
                <i key={`${dias}-${posicao}`} style={{ left: `${Math.min(96, Math.max(4, ((dias - janela.de) / 30) * 100))}%`, animationDelay: `${dias * 6}ms` }} />
              ))}
          </Trecho>
        ))}
        <span className="escala" aria-hidden>
          <span>hoje</span>
          <span>30</span>
          <span>60</span>
          <span>90 dias</span>
        </span>
      </Prazo>
      {births.next.length === 0 ? (
        <EmptyNote>Nenhuma ficha com previsão de nascimento nos próximos 90 dias.</EmptyNote>
      ) : (
        <Bebes>
          {births.next.slice(0, 3).map((item) => {
            const data = parseDateOnly(item.date);
            const dias = Math.round((data.getTime() - base) / DIA);
            const tom = janelaDe(dias).tom;
            return (
              <li key={item.id}>
                <Link href={`/leads/${item.id}`}>
                  <Folhinha $tom={tom} aria-hidden>
                    <b>{data.getDate()}</b>
                    <i>{mesCurto.format(data).replace(".", "")}</i>
                  </Folhinha>
                  <span className="quem">
                    <strong>{item.baby || "Bebê"}</strong>
                    <small>
                      <span>{item.name}</span>
                      {item.client && <SealCheckIcon size={12} weight="fill" aria-label="já é cliente" />}
                    </small>
                  </span>
                  <Falta $tom={tom}>{dias <= 0 ? "hoje" : quandoNasce(item.date, hoje).replace("nasce em ", "")}</Falta>
                </Link>
              </li>
            );
          })}
        </Bebes>
      )}
    </Card>
  );
}

/* ---------- Faturamento mensal ---------- */

const RevenueRoot = styled(Card)`
  flex: 1 1 auto;
`;

const Destaque = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  small { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; }
  > span { display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.spacing(1, 2)}; }
  > span > strong { font-size: 1.5rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: -0.025em; line-height: 1.1; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
`;

/** Uma coluna por mês, do mais antigo ao atual: o valor em cima, a barra e o mês embaixo. */
const Colunas = styled.ul`
  display: grid;
  flex: 1;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-height: 6.25rem;

  li { display: flex; min-width: 0; }
  li > span { display: flex; flex: 1; flex-direction: column; align-items: stretch; gap: 4px; min-width: 0; cursor: default; }
  .valor { overflow: hidden; font-size: 0.625rem; color: ${({ theme }) => theme.colors.text.muted}; text-align: center; white-space: nowrap; }
  .trilho { display: flex; flex: 1; align-items: flex-end; min-height: 2.5rem; }
  .mes { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; text-align: center; }

  li[data-papel="passado"] .valor,
  li[data-papel="passado"] .mes,
  li[data-papel="atual"] .mes { font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
`;

const Barra = styled("i", transientOptions)<{ $altura: number; $papel: "antes" | "passado" | "atual" }>`
  display: block;
  width: 100%;
  height: ${({ $altura }) => Math.max(3, $altura)}%;
  min-height: 3px;
  border-radius: 5px 5px 2px 2px;
  background: ${({ theme, $papel }) =>
    $papel === "passado"
      ? theme.palette.sage[500]
      : $papel === "atual"
        ? `repeating-linear-gradient(135deg, ${theme.palette.sage[300]} 0 4px, ${theme.palette.sage[200]} 4px 8px)`
        : theme.palette.sage[200]};
  transform-origin: bottom;
  animation: barra-sobe 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  transition: filter 160ms;

  li:hover & { filter: brightness(0.94); }
  @keyframes barra-sobe { from { transform: scaleY(0); } }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export type RevenueRow = { month: string; value: number; count: number };

const nomeDoMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });
/** "2026-10" → o dia 1 daquele mês, no fuso de quem vê. */
const mesDe = (chave: string) => parseDateOnly(`${chave}-01`);
const curto = (valor: number) => (valor >= 1000 ? `${Math.round(valor / 1000).toLocaleString("pt-BR")}K` : String(Math.round(valor)));

/**
 * Faturamento mês a mês: o mês passado em destaque (com o crescimento sobre o anterior) e a escala dos últimos seis,
 * com o mês atual ainda em andamento (listrado).
 */
export function RevenueCard({ rows = [] }: { rows?: RevenueRow[] }) {
  const atual = rows[rows.length - 1], passado = rows[rows.length - 2], antes = rows[rows.length - 3];
  const maximo = Math.max(...rows.map((row) => row.value), 1);
  const semVendas = rows.every((row) => row.value === 0);
  return (
    <RevenueRoot aria-label="Faturamento mensal">
      <CardHead title="Faturamento mensal" subtitle="Vendas fechadas, mês a mês" />
      {!passado || semVendas ? (
        <EmptyNote>Nenhuma venda fechada nos últimos seis meses.</EmptyNote>
      ) : (
        <>
          <Destaque>
            <small>Mês passado, {nomeDoMes.format(mesDe(passado.month))}</small>
            <span>
              <strong>{formatMoney(passado.value)}</strong>
              <Delta value={change(passado.value, antes?.value || null)} versus={antes ? `vs ${nomeDoMes.format(mesDe(antes.month))}` : undefined} empty="sem base" />
            </span>
          </Destaque>
          <Colunas aria-label="Faturamento dos últimos seis meses">
            {rows.map((row) => {
              const papel = row === atual ? "atual" : row === passado ? "passado" : "antes";
              const mes = mesDe(row.month);
              return (
                <li key={row.month} data-papel={papel} aria-label={`${nomeDoMes.format(mes)}: ${formatMoney(row.value)} em ${plural(row.count, "venda", "vendas")}${papel === "atual" ? ", mês em andamento" : ""}`}>
                  <Tooltip side="top" delay={120} label={`${nomeDoMes.format(mes)}: ${formatMoney(row.value)} em ${plural(row.count, "venda", "vendas")}${papel === "atual" ? " (em andamento)" : ""}`}>
                    <span className="valor" aria-hidden>{curto(row.value)}</span>
                    <span className="trilho" aria-hidden>
                      <Barra $altura={(row.value / maximo) * 100} $papel={papel} />
                    </span>
                    <span className="mes" aria-hidden>{mesCurto.format(mes).replace(".", "")}</span>
                  </Tooltip>
                </li>
              );
            })}
          </Colunas>
        </>
      )}
    </RevenueRoot>
  );
}

/* ---------- Conversão por canal ---------- */

const Canais = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};

  li { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr) auto auto; align-items: center; gap: ${({ theme }) => theme.spacing(1.5, 2)}; font-size: 0.8125rem; }
  .logo { display: grid; place-items: center; color: ${({ theme }) => theme.colors.text.muted}; }
  .nome { overflow: hidden; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
  .de { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
  .taxa { min-width: 2.25rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; text-align: right; white-space: nowrap; }
`;

const Trilho = styled("span", transientOptions)<{ $parte: number }>`
  grid-column: 1 / -1;
  height: 0.3125rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.palette.sage[100]};
  overflow: hidden;

  &::after {
    content: "";
    display: block;
    width: ${({ $parte }) => Math.min(100, $parte)}%;
    min-width: ${({ $parte }) => ($parte > 0 ? "0.3125rem" : "0")};
    height: 100%;
    border-radius: inherit;
    background: ${({ theme }) => theme.palette.sage[400]};
    transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

/**
 * De cada canal, quantos leads do mês viraram cliente. Diz onde vale investir, sem depender de quantas campanhas
 * existem: os canais são sempre os mesmos.
 */
export function ChannelsCard({ rows }: { rows: SourceRow[] }) {
  const canais = joinSources(rows).sort((a, b) => b.count - a.count || b.converted - a.converted).slice(0, 4);
  const leads = canais.reduce((soma, row) => soma + row.count, 0), clientes = canais.reduce((soma, row) => soma + row.converted, 0);
  return (
    <Card aria-label="Conversão por canal">
      <CardHead title="Conversão por canal" subtitle={leads ? `${clientes} de ${plural(leads, "lead virou", "leads viraram")} cliente no mês` : "Leads do mês que viraram cliente"} />
      {canais.length === 0 ? (
        <EmptyNote>Nenhum lead chegou neste mês ainda.</EmptyNote>
      ) : (
        <Canais>
          {canais.map((row) => {
            const Icone = findChoice(leadSources, row.source)?.icon ?? DotsThreeCircleIcon;
            const taxa = row.count ? (row.converted / row.count) * 100 : 0;
            return (
              <li key={row.source}>
                <span className="logo" aria-hidden>{logoDaOrigem(row.source, 18) ?? <Icone size={17} />}</span>
                <span className="nome">{row.source}</span>
                <span className="de">{row.converted} de {row.count}</span>
                <span className="taxa">{Math.round(taxa)}%</span>
                <Trilho $parte={taxa} aria-hidden />
              </li>
            );
          })}
        </Canais>
      )}
    </Card>
  );
}
