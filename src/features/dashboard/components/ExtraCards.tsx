"use client";

import Link from "next/link";
import type { Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { ClockIcon, DotsThreeCircleIcon, SealCheckIcon } from "@phosphor-icons/react";
import { logoDaOrigem } from "@/components/brand/LogosOrigem";
import { quandoNasce } from "@/features/leads/bebe";
import { findChoice, leadSources } from "@/features/leads/options";
import { transientOptions } from "@/lib/emotion/transient";
import { parseDateOnly } from "@/lib/format";
import type { Tone } from "@/styles/theme";
import { leadsHref, origensDoCanal } from "../links";
import { joinSources, type SourceRow } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

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
  gap: 0;
`;

const Prazo = styled(Link, transientOptions)<{ $tom: Tone; $parte: number }>`
  display: grid;
  grid-template-columns: 5.25rem minmax(0, 1fr) 1.5rem;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  margin: 0 -${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(0.75, 2)};
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

const diaEMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const DIA = 86_400_000;

/** Bebês que estão para chegar: é o prazo de verdade de cada enxoval. */
export function BirthsCard({ births }: { births: Births }) {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const contas = [births.d30, births.d60 - births.d30, births.d90 - births.d60], maior = Math.max(...contas, 1);
  return (
    <Card aria-label="Bebês chegando">
      <CardHead title="Bebês chegando" />
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
            {births.next.slice(0, 5).map((item) => {
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

/* ---------- Conversão por canal ---------- */

/**
 * Uma barra grossa por canal, todas na mesma escala (0 a 100%, marcada em cima): o trecho cheio é quem virou cliente,
 * o hachurado é quem ainda não fechou. À esquerda o canal, à direita a taxa.
 */
const Conversao = styled.div`
  --rotulo: 8.5rem;
  --taxa: 2.75rem;
  --vao: ${({ theme }) => theme.spacing(3)};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};

  @container (max-width: 520px) {
    --rotulo: 5.5rem;
    --vao: ${({ theme }) => theme.spacing(2)};
    .dentro { display: none; }
  }

  /* A escala e as linhas de 25 em 25% ocupam só a coluna das barras */
  .escala, .grade { margin: 0 calc(var(--taxa) + var(--vao)) 0 calc(var(--rotulo) + var(--vao)); }
  .escala { position: relative; height: 0.875rem; font-size: 0.625rem; letter-spacing: 0.06em; color: ${({ theme }) => theme.colors.text.muted}; }
  .escala span { position: absolute; top: 0; transform: translateX(-50%); }
  .escala span:first-of-type { transform: none; }
  .escala span:last-of-type { transform: translateX(-100%); }
  .grade {
    position: absolute;
    top: 1.125rem;
    right: 0;
    bottom: -4px;
    left: 0;
    border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
    background: linear-gradient(to right, ${({ theme }) => theme.colors.border.subtle} 1px, transparent 1px) 0 0 / 25% 100%;
    pointer-events: none;
  }

  ul { position: relative; display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1.5)}; }
  a { display: grid; grid-template-columns: var(--rotulo) minmax(0, 1fr) var(--taxa); align-items: center; gap: var(--vao); color: inherit; font-size: 0.8125rem; text-decoration: none; }
  a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: 2px; border-radius: ${({ theme }) => theme.radii.sm}; }
  .canal { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; }
  .logo { display: grid; flex-shrink: 0; place-items: center; width: 1.25rem; color: ${({ theme }) => theme.colors.text.muted}; }
  .nome { overflow: hidden; color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap; text-overflow: ellipsis; }
  .taxa { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.01em; color: ${({ theme }) => theme.colors.text.primary}; text-align: right; white-space: nowrap; }

  .barra {
    display: flex;
    height: 1.75rem;
    border-radius: 6px;
    /* Quem ainda não fechou: hachurado claro */
    background:
      repeating-linear-gradient(135deg, ${({ theme }) => theme.palette.neutral[200]} 0 1px, transparent 1px 7px),
      ${({ theme }) => theme.palette.neutral[50]};
    overflow: hidden;
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    white-space: nowrap;
    transition: filter 160ms;
  }
  a:hover .barra { filter: brightness(0.96); }
  .cheia, .resto { display: flex; align-items: center; min-width: 0; overflow: hidden; }
  .cheia { background: ${({ theme }) => theme.palette.sage[500]}; color: ${({ theme }) => theme.palette.neutral[0]}; box-shadow: 2px 0 0 ${({ theme }) => theme.palette.neutral[0]}; transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1); }
  .resto { flex: 1; color: ${({ theme }) => theme.colors.text.muted}; font-weight: ${({ theme }) => theme.fontWeights.medium}; }
  .dentro { padding: 0 ${({ theme }) => theme.spacing(2.5)}; }
`;

/**
 * De cada canal, quantos leads do mês viraram cliente. Diz onde vale investir, sem depender de quantas campanhas
 * existem: os canais são sempre os mesmos.
 */
export function ChannelsCard({ rows }: { rows: SourceRow[] }) {
  const canais = joinSources(rows).sort((a, b) => b.count - a.count || b.converted - a.converted).slice(0, 4);
  return (
    <Card aria-label="Conversão por canal">
      <CardHead title="Conversão por canal" />
      {canais.length === 0 ? (
        <EmptyNote>Nenhum lead chegou neste mês ainda.</EmptyNote>
      ) : (
        <Conversao>
          <div className="escala" aria-hidden>
            {[0, 25, 50, 75, 100].map((marca) => <span key={marca} style={{ left: `${marca}%` }}>{marca}%</span>)}
          </div>
          <div className="grade" aria-hidden />
          <ul>
            {canais.map((row) => {
              const Icone = findChoice(leadSources, row.source)?.icon ?? DotsThreeCircleIcon;
              const taxa = row.count ? (row.converted / row.count) * 100 : 0, abertos = row.count - row.converted;
              return (
                <li key={row.source}>
                  <Link href={leadsHref({ origens: origensDoCanal(row.source), criados: 30 })} aria-label={`${row.source}: ${row.converted} de ${plural(row.count, "lead virou", "leads viraram")} cliente, ${Math.round(taxa)}%. Abrir a lista`}>
                    <span className="canal">
                      <span className="logo" aria-hidden>{logoDaOrigem(row.source, 18) ?? <Icone size={17} />}</span>
                      <span className="nome">{row.source}</span>
                    </span>
                    <span className="barra" aria-hidden>
                      {taxa > 0 && <span className="cheia" style={{ width: `${taxa}%` }}>{taxa >= 14 && <span className="dentro">{plural(row.converted, "cliente", "clientes")}</span>}</span>}
                      <span className="resto">{100 - taxa >= 14 && <span className="dentro">{abertos} em aberto</span>}</span>
                    </span>
                    <span className="taxa">{Math.round(taxa)}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Conversao>
      )}
    </Card>
  );
}
