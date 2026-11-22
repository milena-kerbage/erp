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

/** A cor do selo de quanto falta esquenta conforme o nascimento chega perto: de azul-esverdeado (longe) a rosa (dias). */
const tomDoPrazo = (dias: number): Tone => (dias <= 7 ? "rose" : dias <= 14 ? "peach" : dias <= 30 ? "yellow" : dias <= 60 ? "green" : "teal");

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

/** Quanto falta: selo com o relógio; a cor acompanha o quão perto está (ver tomDoPrazo). */
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
                    <Falta $tom={tomDoPrazo(dias)}>
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
 * Uma barra só para os clientes do mês, repartida por canal (cada trecho tem a largura da parte dele): o canal que
 * mais converteu vem cheio, os seguintes em tons mais claros e o último hachurado. Em cima a escala; em cada divisa
 * uma linha que passa pela barra; embaixo de cada trecho, o canal e a conversão dele.
 */
const Conversao = styled.div`
  display: flex;
  flex-direction: column;

  .escala { position: relative; height: 0.875rem; font-size: 0.625rem; letter-spacing: 0.08em; color: ${({ theme }) => theme.colors.text.muted}; text-transform: uppercase; white-space: nowrap; }
  .escala span { position: absolute; top: 0; transform: translateX(-50%); }
  .escala span:first-of-type { transform: none; }
  .escala span:last-of-type { right: 0; transform: none; }

  /* Os trechos lado a lado; a linha do fim (o total) fecha a barra, como na referência */
  .trechos { position: relative; display: flex; padding-top: 0.75rem; }
  .trechos::after { content: ""; position: absolute; top: 0; right: 0; bottom: 1.5rem; width: 2px; background: ${({ theme }) => theme.palette.sage[700]}; }

  a { position: relative; display: flex; flex-direction: column; min-width: 2.75rem; color: inherit; text-decoration: none; }
  a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: 2px; border-radius: ${({ theme }) => theme.radii.sm}; }
  /* A linha da divisa: nasce acima da barra e desce até o rótulo */
  a + a::before { content: ""; position: absolute; top: -0.75rem; bottom: 1.5rem; left: 0; z-index: 1; width: 1px; background: ${({ theme }) => theme.colors.border.default}; }

  .parte { display: flex; align-items: center; height: 1.875rem; padding: 0 ${({ theme }) => theme.spacing(3)}; overflow: hidden; font-size: 0.75rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; white-space: nowrap; transition: filter 160ms; }
  a:hover .parte { filter: brightness(0.95); }
  .parte[data-tom="1"] { background: ${({ theme }) => theme.palette.sage[600]}; color: ${({ theme }) => theme.palette.neutral[0]}; }
  .parte[data-tom="2"] { background: ${({ theme }) => theme.palette.sage[400]}; color: ${({ theme }) => theme.palette.neutral[0]}; }
  .parte[data-tom="3"] { background: ${({ theme }) => theme.palette.sage[200]}; color: ${({ theme }) => theme.palette.sage[800]}; }
  .parte[data-tom="4"] {
    background:
      repeating-linear-gradient(135deg, ${({ theme }) => theme.palette.neutral[300]} 0 1px, transparent 1px 7px),
      ${({ theme }) => theme.palette.neutral[50]};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.palette.neutral[200]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .rotulo { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: ${({ theme }) => theme.spacing(3, 2, 0, 2.5)}; line-height: 1.2; }
  a:first-of-type .rotulo { padding-left: 0; }
  .rotulo strong { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  .rotulo strong > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .rotulo strong > svg, .rotulo strong > i { flex-shrink: 0; }
  .rotulo small { overflow: hidden; font-size: 0.625rem; letter-spacing: 0.08em; color: ${({ theme }) => theme.colors.text.muted}; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; }

  /* Cartão estreito: os rótulos não cabem embaixo dos trechos; viram uma lista */
  .lista { display: none; }
  @container (max-width: 520px) {
    a { min-width: 1.25rem; }
    .parte { padding: 0; justify-content: center; }
    .parte > span, .rotulo { display: none; }
    .trechos::after, a + a::before { bottom: 0; }
    .lista { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${({ theme }) => theme.spacing(2.5, 3)}; margin-top: ${({ theme }) => theme.spacing(3.5)}; }
    .lista .rotulo { display: flex; padding: 0; }
  }
`;

/**
 * De onde vieram os clientes do mês e quanto cada canal converte, numa barra só. Não depende de quantas campanhas
 * existem: os canais são sempre os mesmos.
 */
export function ChannelsCard({ rows }: { rows: SourceRow[] }) {
  const todos = joinSources(rows);
  const leads = todos.reduce((soma, row) => soma + row.count, 0);
  // Quem converteu, do maior para o menor: até quatro trechos (do quarto em diante, juntos em "Outros").
  const comClientes = todos.filter((row) => row.converted > 0).sort((a, b) => b.converted - a.converted || b.count - a.count);
  const resto = comClientes.slice(3);
  const partes = [
    ...comClientes.slice(0, 3).map((row) => ({ nome: row.source, origens: origensDoCanal(row.source), clientes: row.converted, leads: row.count, logo: true })),
    ...(resto.length === 1
      ? [{ nome: resto[0].source, origens: origensDoCanal(resto[0].source), clientes: resto[0].converted, leads: resto[0].count, logo: true }]
      : resto.length > 1
        ? [{ nome: "Outros", origens: resto.flatMap((row) => origensDoCanal(row.source)), clientes: resto.reduce((soma, row) => soma + row.converted, 0), leads: resto.reduce((soma, row) => soma + row.count, 0), logo: false }]
        : []),
  ];
  const clientes = partes.reduce((soma, parte) => soma + parte.clientes, 0);
  const rotulo = (parte: (typeof partes)[number]) => {
    const Icone = findChoice(leadSources, parte.nome)?.icon ?? DotsThreeCircleIcon;
    return (
      <span className="rotulo">
        <strong>
          {(parte.logo && logoDaOrigem(parte.nome, 15)) || <Icone size={15} aria-hidden />}
          <span>{parte.nome}</span>
        </strong>
        <small>{parte.clientes} de {parte.leads} · {Math.round((parte.clientes / parte.leads) * 100)}%</small>
      </span>
    );
  };
  return (
    <Card aria-label="Conversão por canal">
      <CardHead title="Conversão por canal" />
      {partes.length === 0 ? (
        <EmptyNote>{leads ? "Nenhum lead deste mês virou cliente ainda." : "Nenhum lead chegou neste mês ainda."}</EmptyNote>
      ) : (
        <Conversao>
          <div className="escala" aria-hidden>
            {[0, 25, 50, 75].map((marca) => <span key={marca} style={{ left: `${marca}%` }}>{marca}%</span>)}
            <span>{plural(clientes, "cliente", "clientes")} de {plural(leads, "lead", "leads")}</span>
          </div>
          <div className="trechos">
            {partes.map((parte, indice) => (
              <Link
                key={parte.nome}
                href={leadsHref({ origens: parte.origens, criados: 30 })}
                style={{ flex: `${parte.clientes} 1 0` }}
                aria-label={`${parte.nome}: ${plural(parte.clientes, "cliente", "clientes")} de ${plural(parte.leads, "lead", "leads")}, ${Math.round((parte.clientes / parte.leads) * 100)}% de conversão. Abrir a lista`}
              >
                <span className="parte" data-tom={indice === partes.length - 1 && partes.length > 1 ? 4 : indice + 1} aria-hidden>
                  <span>{plural(parte.clientes, "cliente", "clientes")}</span>
                </span>
                {rotulo(parte)}
              </Link>
            ))}
          </div>
          <div className="lista" aria-hidden>
            {partes.map((parte) => <div key={parte.nome}>{rotulo(parte)}</div>)}
          </div>
        </Conversao>
      )}
    </Card>
  );
}
