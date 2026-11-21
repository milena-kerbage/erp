"use client";

import Link from "next/link";
import type { Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { ClockIcon, DotsThreeCircleIcon, SealCheckIcon } from "@phosphor-icons/react";
import { logoDaOrigem } from "@/components/brand/LogosOrigem";
import { Tooltip } from "@/components/ui/Tooltip";
import { quandoNasce } from "@/features/leads/bebe";
import { findChoice, leadSources } from "@/features/leads/options";
import { transientOptions } from "@/lib/emotion/transient";
import { parseDateOnly } from "@/lib/format";
import type { Tone } from "@/styles/theme";
import { leadsHref, origensDoCanal } from "../links";
import { change, formatMoney, joinSources, type SourceRow } from "../metrics";
import { Card, CardHead, Delta, EmptyNote } from "./ui";

/* Coluna de apoio do Painel: os bebês que estão para chegar (o prazo real de cada enxoval), o faturamento mês a mês
   e quanto cada canal converte. */

const plural = (quantidade: number, um: string, varios: string) => `${quantidade} ${quantidade === 1 ? um : varios}`;

/* ---------- Bebês chegando ---------- */

/** As três janelas do prazo, da mais urgente para a mais tranquila: a cor acompanha a urgência. */
const JANELAS: readonly { de: number; ate: 30 | 60 | 90; rotulo: string; tom: Tone }[] = [
  { de: 0, ate: 30, rotulo: "Até 30 dias", tom: "rose" },
  { de: 30, ate: 60, rotulo: "31 a 60 dias", tom: "peach" },
  { de: 60, ate: 90, rotulo: "61 a 90 dias", tom: "green" },
];

const janelaDe = (dias: number) => JANELAS.find((janela) => dias <= janela.ate) ?? JANELAS[JANELAS.length - 1];

/** A cor cheia de cada janela na barra: o tom pastel com mais presença (o destaque puro some numa barra fina). */
const corDaJanela = (theme: Theme, tom: Tone) => (theme.mode === "dark" ? theme.tones[tom].fg : `color-mix(in srgb, ${theme.tones[tom].fg} 42%, ${theme.tones[tom].soft})`);

/**
 * Uma linha por prazo, lida da esquerda para a direita: o prazo, a barra na cor dele (proporcional ao prazo mais
 * cheio) e quantos bebês nascem nele. A linha inteira leva aos leads daquele prazo.
 */
const Prazos = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Prazo = styled(Link, transientOptions)<{ $tom: Tone; $parte: number }>`
  display: grid;
  grid-template-columns: 5.25rem minmax(0, 1fr) 1.5rem;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  margin: 0 -${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  border-radius: ${({ theme }) => theme.radii.md};
  color: inherit;
  font-size: 0.75rem;
  text-decoration: none;
  transition: background-color 160ms;

  &:hover, &:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .prazo { color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap; }
  .trilho { height: 0.5rem; border-radius: 999px; background: ${({ theme }) => theme.palette.neutral[100]}; overflow: hidden; }
  .trilho::after {
    content: "";
    display: block;
    width: ${({ $parte }) => Math.min(100, $parte)}%;
    min-width: ${({ $parte }) => ($parte > 0 ? "0.5rem" : "0")};
    height: 100%;
    border-radius: inherit;
    background: ${({ theme, $tom }) => corDaJanela(theme, $tom)};
    transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  strong { font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; text-align: right; }
`;

/** Título discreto que separa os prazos da lista dos próximos nascimentos. */
const Subtitulo = styled.h4`
  margin: 0;
  padding-top: ${({ theme }) => theme.spacing(3.5)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
`;

const Bebes = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: -${({ theme }) => theme.spacing(2)};

  a { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2.5)}; margin: 0 -${({ theme }) => theme.spacing(2)}; padding: ${({ theme }) => theme.spacing(1.5, 2)}; border-radius: ${({ theme }) => theme.radii.md}; color: inherit; text-decoration: none; transition: background-color 160ms; }
  a:hover, a:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .quem { display: flex; flex: 1; flex-direction: column; min-width: 0; line-height: 1.3; }
  .quem strong { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }
  .quem strong > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .quem strong > svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary.main}; }
  .quem small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
`;

/** Quanto falta: selo com o relógio, na cor da janela. */
const Falta = styled("span", transientOptions)<{ $tom: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  height: 1.375rem;
  padding: 0 9px 0 6px;
  border-radius: 999px;
  background: ${({ theme, $tom }) => theme.tones[$tom].soft};
  color: ${({ theme, $tom }) => theme.tones[$tom].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;
`;

export type Births = { d30: number; d60: number; d90: number; next: { id: string; name: string; baby: string; date: string; client: boolean }[] };

const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const diaEMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const DIA = 86_400_000;

/** Bebês que estão para chegar: é o prazo de verdade de cada enxoval. */
export function BirthsCard({ births }: { births: Births }) {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const contas = [births.d30, births.d60 - births.d30, births.d90 - births.d60], maior = Math.max(...contas, 1);
  return (
    <Card aria-label="Bebês chegando">
      <CardHead title="Bebês chegando" subtitle={births.d90 ? `${plural(births.d90, "nascimento", "nascimentos")} nos próximos 90 dias` : "O prazo de cada enxoval"} />
      <Prazos aria-label="Nascimentos por prazo">
        {JANELAS.map((janela, indice) => (
          <li key={janela.ate}>
            <Prazo $tom={janela.tom} $parte={(contas[indice] / maior) * 100} href={leadsHref({ nascimento: janela.ate })} aria-label={`${janela.rotulo}: ${plural(contas[indice], "nascimento", "nascimentos")}. Abrir quem nasce em até ${janela.ate} dias`}>
              <span className="prazo">{janela.rotulo}</span>
              <span className="trilho" aria-hidden />
              <strong>{contas[indice]}</strong>
            </Prazo>
          </li>
        ))}
      </Prazos>
      {births.next.length === 0 ? (
        <EmptyNote>Nenhuma ficha com previsão de nascimento nos próximos 90 dias.</EmptyNote>
      ) : (
        <>
          <Subtitulo>Próximos a nascer</Subtitulo>
          <Bebes>
            {births.next.slice(0, 3).map((item) => {
              const data = parseDateOnly(item.date);
              const dias = Math.round((data.getTime() - base) / DIA);
              return (
                <li key={item.id}>
                  <Link href={`/leads/${item.id}`}>
                    <span className="quem">
                      <strong>
                        <span>{item.baby || "Bebê"}</span>
                        {item.client && <SealCheckIcon size={13} weight="fill" aria-label="já é cliente" />}
                      </strong>
                      <small>{item.name} · {diaEMes.format(data).replace(".", "")}</small>
                    </span>
                    <Falta $tom={janelaDe(dias).tom}>
                      <ClockIcon size={12} weight="bold" aria-hidden />
                      {dias <= 0 ? "hoje" : quandoNasce(item.date, hoje).replace("nasce em ", "")}
                    </Falta>
                  </Link>
                </li>
              );
            })}
          </Bebes>
        </>
      )}
    </Card>
  );
}

/* ---------- Faturamento mensal ---------- */

const RevenueRoot = styled(Card)`
  flex: 1 1 auto;
`;

const Destaque = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: -4px -6px;
  padding: 4px 6px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: inherit;
  text-decoration: none;
  transition: background-color 160ms;

  &:hover, &:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }

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
  li > span { display: flex; flex: 1; min-width: 0; }
  li a { display: flex; flex: 1; flex-direction: column; align-items: stretch; gap: 4px; min-width: 0; border-radius: ${({ theme }) => theme.radii.sm}; color: inherit; text-decoration: none; }
  li a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: 2px; }
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
          <Destaque href={leadsHref({ categoria: "cliente" })} aria-label={`Mês passado, ${nomeDoMes.format(mesDe(passado.month))}: ${formatMoney(passado.value)}. Abrir os clientes`}>
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
                <li key={row.month} data-papel={papel}>
                  <Tooltip side="top" delay={120} label={`${nomeDoMes.format(mes)}: ${formatMoney(row.value)} em ${plural(row.count, "venda", "vendas")}${papel === "atual" ? " (em andamento)" : ""}`}>
                    <Link href={leadsHref({ categoria: "cliente" })} aria-label={`${nomeDoMes.format(mes)}: ${formatMoney(row.value)} em ${plural(row.count, "venda", "vendas")}${papel === "atual" ? ", mês em andamento" : ""}. Abrir os clientes`}>
                      <span className="valor" aria-hidden>{curto(row.value)}</span>
                      <span className="trilho" aria-hidden>
                        <Barra $altura={(row.value / maximo) * 100} $papel={papel} />
                      </span>
                      <span className="mes" aria-hidden>{mesCurto.format(mes).replace(".", "")}</span>
                    </Link>
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
  gap: ${({ theme }) => theme.spacing(1)};

  a { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr) auto auto; align-items: center; gap: ${({ theme }) => theme.spacing(1.5, 2)}; margin: 0 -${({ theme }) => theme.spacing(2)}; padding: ${({ theme }) => theme.spacing(1.5, 2)}; border-radius: ${({ theme }) => theme.radii.md}; color: inherit; font-size: 0.8125rem; text-decoration: none; transition: background-color 160ms; }
  a:hover, a:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
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
                <Link href={leadsHref({ origens: origensDoCanal(row.source), criados: 30 })} aria-label={`${row.source}: ${row.converted} de ${plural(row.count, "lead virou", "leads viraram")} cliente, ${Math.round(taxa)}%. Abrir a lista`}>
                  <span className="logo" aria-hidden>{logoDaOrigem(row.source, 18) ?? <Icone size={17} />}</span>
                  <span className="nome">{row.source}</span>
                  <span className="de">{row.converted} de {row.count}</span>
                  <span className="taxa">{Math.round(taxa)}%</span>
                  <Trilho $parte={taxa} aria-hidden />
                </Link>
              </li>
            );
          })}
        </Canais>
      )}
    </Card>
  );
}
