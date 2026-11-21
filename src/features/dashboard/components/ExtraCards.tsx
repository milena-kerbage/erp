"use client";

import Link from "next/link";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { Avatar } from "@/components/ui/Avatar";
import { jaNasceu, quandoNasce } from "@/features/leads/bebe";
import { transientOptions } from "@/lib/emotion/transient";
import { formatMoney } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

/* Três blocos do Painel no lugar de "Atenção hoje" e "Últimas atualizações": o que as campanhas trouxeram, como
   cada pessoa da equipe está indo e os bebês que estão para chegar (o prazo real do enxoval). */

const Linhas = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
`;

const Linha = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1, 2)};
  font-size: 0.75rem;

  .nome { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; }
  .nome > span { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  .nome strong { overflow: hidden; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
  .nome small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  .valor { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25; }
  .valor strong { font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }
  .valor small { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
`;

const Trilho = styled("span", transientOptions)<{ $parte: number; $cor: string }>`
  grid-column: 1 / -1;
  height: 0.25rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.palette.neutral[100]};
  overflow: hidden;

  &::after {
    content: "";
    display: block;
    width: ${({ $parte }) => Math.max(2, Math.min(100, $parte))}%;
    height: 100%;
    border-radius: inherit;
    background: ${({ $cor }) => $cor};
    transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

const plural = (quantidade: number, um: string, varios: string) => `${quantidade} ${quantidade === 1 ? um : varios}`;

export type CampaignRow = { channel: string; campaign: string; count: number; value: number; won: number };

/** O que as campanhas e os canais rastreados trouxeram no mês (aba Campanha das fichas). */
export function CampaignsCard({ rows, tracked, total }: { rows: CampaignRow[]; tracked: number; total: number }) {
  const theme = useTheme();
  const maximo = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card aria-label="Campanhas e canais">
      <CardHead title="Campanhas e canais" subtitle={total ? `${tracked} de ${plural(total, "lead", "leads")} com origem rastreada` : "Origem rastreada dos leads"} />
      {rows.length === 0 ? (
        <EmptyNote>Nenhum lead do mês chegou com campanha rastreada ainda.</EmptyNote>
      ) : (
        <Linhas>
          {rows.slice(0, 4).map((row) => (
            <Linha key={`${row.channel}|${row.campaign}`}>
              <span className="nome">
                <span>
                  <strong title={row.campaign || row.channel}>{row.campaign || row.channel}</strong>
                  <small>{row.campaign ? row.channel : "sem nome de campanha"}</small>
                </span>
              </span>
              <span className="valor">
                <strong>{formatMoney(row.value)}</strong>
                <small>{plural(row.count, "lead", "leads")}{row.won ? ` · ${plural(row.won, "fechado", "fechados")}` : ""}</small>
              </span>
              <Trilho $parte={(row.value / maximo) * 100} $cor={theme.tones.peach.fg} aria-hidden />
            </Linha>
          ))}
        </Linhas>
      )}
    </Card>
  );
}

export type OwnerRow = { owner: string; count: number; value: number; won: number };

/** Como cada pessoa da equipe está indo com os leads do mês. */
export function OwnersCard({ rows }: { rows: OwnerRow[] }) {
  const theme = useTheme();
  const maximo = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card aria-label="Equipe no mês">
      <CardHead title="Equipe no mês" subtitle="Leads do mês por responsável" />
      {rows.length === 0 ? (
        <EmptyNote>Nenhum lead chegou neste mês ainda.</EmptyNote>
      ) : (
        <Linhas>
          {rows.slice(0, 4).map((row) => (
            <Linha key={row.owner}>
              <span className="nome">
                <Avatar name={row.owner} seed={row.owner} size="xs" shape="circle" />
                <span>
                  <strong>{row.owner}</strong>
                  <small>{plural(row.count, "lead", "leads")} · {row.count ? Math.round((row.won / row.count) * 100) : 0}% viraram cliente</small>
                </span>
              </span>
              <span className="valor">
                <strong>{formatMoney(row.value)}</strong>
                <small>{plural(row.won, "fechado", "fechados")}</small>
              </span>
              <Trilho $parte={(row.value / maximo) * 100} $cor={theme.tones.blue.fg} aria-hidden />
            </Linha>
          ))}
        </Linhas>
      )}
    </Card>
  );
}

const Janelas = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};

  > div { display: flex; flex-direction: column; gap: 1px; padding: ${({ theme }) => theme.spacing(2, 2.5)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.tones.rose.bg}; }
  strong { font-size: 1.125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; letter-spacing: -0.02em; line-height: 1.1; color: ${({ theme }) => theme.colors.text.primary}; }
  small { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.secondary}; }
`;

const Bebes = styled.ul`
  display: flex;
  flex-direction: column;

  a { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2.5)}; margin: 0 -${({ theme }) => theme.spacing(2)}; padding: ${({ theme }) => theme.spacing(1, 2)}; border-radius: ${({ theme }) => theme.radii.md}; color: inherit; text-decoration: none; transition: background-color 160ms; }
  a:hover, a:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .quem { display: flex; flex: 1; flex-direction: column; min-width: 0; line-height: 1.25; }
  .quem strong { overflow: hidden; font-size: 0.75rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
  .quem small { overflow: hidden; font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; text-overflow: ellipsis; }
  .quando { flex-shrink: 0; padding: 2px 8px; border-radius: 999px; background: ${({ theme }) => theme.tones.rose.soft}; color: ${({ theme }) => theme.tones.rose.fg}; font-size: 0.6875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; white-space: nowrap; }
  .quando[data-cliente] { background: ${({ theme }) => theme.tones.green.soft}; color: ${({ theme }) => theme.tones.green.fg}; }
`;

export type Births = { d30: number; d60: number; d90: number; next: { id: string; name: string; baby: string; date: string; client: boolean }[] };

/** Bebês que estão para chegar: é o prazo de verdade de cada enxoval. */
export function BirthsCard({ births }: { births: Births }) {
  return (
    <Card aria-label="Bebês chegando">
      <CardHead title="Bebês chegando" subtitle="O prazo de cada enxoval" />
      <Janelas>
        <div><strong>{births.d30}</strong><small>em 30 dias</small></div>
        <div><strong>{births.d60}</strong><small>em 60 dias</small></div>
        <div><strong>{births.d90}</strong><small>em 90 dias</small></div>
      </Janelas>
      {births.next.length === 0 ? (
        <EmptyNote>Nenhuma ficha com previsão de nascimento nos próximos 90 dias.</EmptyNote>
      ) : (
        <Bebes>
          {births.next.slice(0, 4).map((item) => (
            <li key={item.id}>
              <Link href={`/leads/${item.id}`}>
                <span className="quem">
                  <strong>{item.baby || "Bebê"}</strong>
                  <small>{item.name}{item.client ? " · já é cliente" : ""}</small>
                </span>
                <span className="quando" data-cliente={item.client || undefined}>{jaNasceu(item.date) ? "nasce hoje" : quandoNasce(item.date).replace("nasce em ", "em ")}</span>
              </Link>
            </li>
          ))}
        </Bebes>
      )}
    </Card>
  );
}
