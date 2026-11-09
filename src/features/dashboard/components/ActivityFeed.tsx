"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import styled from "@emotion/styled";
import {
  ArrowFatLinesRightIcon,
  ChatCircleTextIcon,
  ListChecksIcon,
  PaperclipIcon,
  UserPlusIcon,
  UserSwitchIcon,
  type Icon,
} from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import { formatTime } from "@/lib/format";
import type { Tone } from "@/styles/theme";
import { findStatus } from "@/features/conversations/status";
import {erpRequest} from "@/features/erp/client";
import { useFunnels } from "@/features/settings/store";
import { dayKey, startOfDay } from "../metrics";
import { Card, CardHead, EmptyNote, Segmented, SegmentedItem } from "./ui";

type Range = "today" | "yesterday" | "week";

const ranges: { value: Range; label: string; caption: string }[] = [
  { value: "today", label: "Hoje", caption: "hoje" },
  { value: "yesterday", label: "Ontem", caption: "ontem" },
  { value: "week", label: "7 dias", caption: "nos últimos 7 dias" },
];

type Activity = {
  id: string;
  at: string;
  icon: Icon;
  tone: Tone;
  title: string;
  /** Texto do detalhe; os trechos em `strong` ganham destaque. */
  detail: ReactNode;
  /** Texto puro do detalhe (busca). */
  text: string;
  href: string;
};

/* ---------- Estilos ---------- */

/** Hoje / Ontem / 7 dias ocupando a largura do cartão. */
const Ranges = styled(Segmented)`
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
`;

/** Ocupa o que sobra da coluna e rola por dentro (a coluna fecha junto com a grade). */
const List = styled.ol`
  display: flex;
  flex: 1 1 0;
  height: 0;
  min-height: 12rem;
  flex-direction: column;
  gap: 2px;
  /* Folga para a barra de rolagem não colar no conteúdo */
  margin-right: -10px;
  padding-right: 6px;
  overflow-y: auto;
`;

const Item = styled(Link)`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(2.5)};
  padding: ${({ theme }) => theme.spacing(2, 1.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
  }
`;

const Tile = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
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

  > strong {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  > span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.muted};
    overflow-wrap: anywhere;

    strong {
      font-weight: ${({ theme }) => theme.fontWeights.medium};
      color: ${({ theme }) => theme.colors.text.secondary};
    }
  }
`;

const Time = styled.time`
  flex-shrink: 0;
  padding-top: 1px;
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

/* ---------- Componente ---------- */

/** Tudo o que aconteceu no ateliê: leads novos, etapas, responsáveis, conversas e arquivos. */
export function ActivityFeed({ now, className }: { now: Date; className?: string }) {
  const [events,setEvents]=useState<{id:string;action:string;at:string;leadId:string;name:string}[]>([]);
  useEffect(()=>{let active=true;void erpRequest<{events:typeof events}>("/dashboard/activity").then(result=>{if(active)setEvents(result.events);}).catch(()=>{});return()=>{active=false;};},[]);
  const { findFunnel } = useFunnels();
  const [range, setRange] = useState<Range>("week");

  const activities=useMemo<Activity[]>(()=>events.map(event=>({id:event.id,at:event.at,href:`/leads/${event.leadId}`,icon:event.action==='created'?UserPlusIcon:ListChecksIcon,tone:'green',title:({created:'Novo lead',updated:'Ficha atualizada',note_created:'Nota registrada',file_attached:'Arquivo anexado',file_removed:'Arquivo removido'} as Record<string,string>)[event.action]??'Ficha atualizada',detail:<strong>{event.name}</strong>,text:event.name})),[events]);

  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  const inRange = (activity: Activity) => {
    const date = new Date(activity.at);
    if (range === "today") return dayKey(date) === dayKey(today);
    if (range === "yesterday") return dayKey(date) === dayKey(yesterday);
    return date.getTime() >= weekStart.getTime() && date.getTime() <= now.getTime() + 60_000;
  };

  const visible = activities.filter(inRange);
  const caption = ranges.find((item) => item.value === range)?.caption;

  return (
    <Card className={className} aria-label="Últimas atualizações" style={{ flex: 1, minHeight: 0 }}>
      <CardHead title="Últimas atualizações" subtitle={`${visible.length} ${visible.length === 1 ? "atividade" : "atividades"} ${caption}`} />
      <Ranges role="radiogroup" aria-label="Quando">
          {ranges.map((item) => (
            <SegmentedItem
              key={item.value}
              type="button"
              role="radio"
              aria-checked={range === item.value}
              $active={range === item.value}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </SegmentedItem>
          ))}
      </Ranges>

      <List aria-label="Atividades" aria-live="polite">
        {visible.length === 0 && (
          <li>
            <EmptyNote>Nada por aqui {caption}.</EmptyNote>
          </li>
        )}
        {visible.map((activity) => {
          const date = new Date(activity.at);
          const sameDay = dayKey(date) === dayKey(today);
          return (
            <li key={activity.id}>
              <Item href={activity.href}>
                <Tile $tone={activity.tone} aria-hidden>
                  <activity.icon size={15} weight="bold" />
                </Tile>
                <Texts>
                  <strong>{activity.title}</strong>
                  <span>{activity.detail}</span>
                </Texts>
                <Time dateTime={activity.at}>
                  {sameDay || range === "yesterday" ? formatTime(activity.at) : shortDate.format(date)}
                </Time>
              </Item>
            </li>
          );
        })}
      </List>
    </Card>
  );
}
