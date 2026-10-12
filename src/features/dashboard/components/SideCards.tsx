"use client";

import Link from "next/link";
import styled from "@emotion/styled";
import {
  ArrowRightIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  type Icon,
} from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import { formatAgo } from "@/lib/format";
import type { Tone } from "@/styles/theme";
import type { Lead } from "@/features/leads/types";
import type { AttentionRow } from "../metrics";
import { Card, CardHead, EmptyNote } from "./ui";

/* ---------- Estilos comuns ---------- */

const List = styled.ul`
  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => theme.spacing(0, -2)};

  /* Divisória fina entre os itens (sem encostar nas bordas) */
  > li + li {
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      right: ${({ theme }) => theme.spacing(2)};
      left: ${({ theme }) => theme.spacing(2)};
      height: 1px;
      background-color: ${({ theme }) => theme.colors.border.faint};
    }
  }
`;

const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2.5, 2)};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }

  > svg:last-of-type {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Tile = styled("span", transientOptions)<{ $tone: Tone }>`
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

const Texts = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  strong {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Pill = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  white-space: nowrap;
`;

const Footer = styled(Link)`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: ${({ theme }) => theme.spacing(1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/* ---------- Atenção hoje ---------- */

type AttentionItem = {
  id: string;
  href: string;
  icon: Icon;
  tone: Tone;
  title: string;
  detail: string;
  badge: string;
  badgeTone: Tone;
};

const HOUR = 3_600_000;

/**
 * O que não pode esperar: clientes aguardando resposta (quem espera há mais
 * tempo primeiro) e leads sem contato há uma semana.
 */
export function AttentionCard({ waiting, stale, now }: { waiting: AttentionRow[]; stale: Lead[]; now: Date }) {
  const items: AttentionItem[] = [
    ...waiting.map((row) => {
      const hours = row.waitingSince ? (now.getTime() - new Date(row.waitingSince).getTime()) / HOUR : 0;
      return {
        id: `reply-${row.lead.id}`,
        href: `/leads/${row.lead.id}`,
        icon: ChatCircleDotsIcon,
        tone: "blue" as Tone,
        title: `Atendimento de ${row.lead.name}`,
        detail: row.last?.text || "Enviou um anexo",
        badge: `há ${formatAgo(row.waitingSince ?? now.toISOString())}`,
        badgeTone: (hours >= 24 ? "rose" : hours >= 2 ? "peach" : "blue") as Tone,
      };
    }),
    ...stale.map((lead) => ({
      id: `stale-${lead.id}`,
      href: `/leads/${lead.id}`,
      icon: ClockCounterClockwiseIcon,
      tone: "peach" as Tone,
      title: `Retomar ${lead.name}`,
      detail: "Sem contato há mais de uma semana",
      badge: "Retomar",
      badgeTone: "neutral" as Tone,
    })),
  ];
  const shown = items.slice(0, 5);

  return (
    <Card aria-label="Atenção hoje">
      <CardHead title="Atenção hoje" subtitle="Quem espera resposta e quem esfriou" count={items.length} />
      {shown.length === 0 ? (
        <EmptyNote>Tudo em dia por aqui.</EmptyNote>
      ) : (
        <List>
          {shown.map((item) => (
            <li key={item.id}>
              <Row href={item.href}>
                <Tile $tone={item.tone} aria-hidden>
                  <item.icon size={15} weight="bold" />
                </Tile>
                <Texts>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </Texts>
                <Pill $tone={item.badgeTone}>{item.badge}</Pill>
                <CaretRightIcon size={14} aria-hidden />
              </Row>
            </li>
          ))}
        </List>
      )}
      {items.length > shown.length && (
        <Footer href="/conversas">
          Ver os outros {items.length - shown.length}
          <ArrowRightIcon size={12} aria-hidden />
        </Footer>
      )}
    </Card>
  );
}
