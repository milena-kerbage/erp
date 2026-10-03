"use client";

import { useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatAgo, formatDateTime } from "@/lib/format";
import type { Funnel } from "@/features/leads/funnels";
import { useFunnels, useWorkspace } from "@/features/settings/store";
import type { Member } from "@/features/settings/types";
import type { HistoryEvent, Lead } from "@/features/leads/types";
import { StatusBadge } from "../../status";
import { ActivityCard, ActivityHead, ActivityList, ActivityRow, ActivityText, ActivityTime } from "./styles";

/** Quantos eventos aparecem antes do "Ver tudo". */
const VISIBLE = 3;

const stageLabel = (funnels: readonly Funnel[], id: string) =>
  funnels.flatMap((funnel) => funnel.stages).find((stage) => stage.id === id)?.label ?? id;

/** Avatar de quem fez: equipe pelo nome, o próprio lead ou o nome como base. */
function Actor({ name, lead, team }: { name: string; lead: Lead; team: readonly Member[] }) {
  const member = team.find((item) => item.name === name);
  if (member) return <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="xs" shape="circle" />;
  if (name === lead.name || name === "Sistema")
    return <Avatar name={lead.name} seed={lead.id} src={lead.photoUrl} size="xs" shape="circle" />;
  return <Avatar name={name} seed={name} size="xs" shape="circle" />;
}

function describe(event: HistoryEvent, lead: Lead, funnels: readonly Funnel[]): ReactNode {
  switch (event.type) {
    case "created":
      return (
        <>
          <b>{lead.name}</b> chegou pelo <b>{event.source}</b>
        </>
      );
    case "owner":
      return (
        <>
          <b>{event.by}</b> atribuiu a <b>{event.owner}</b>
        </>
      );
    case "status":
      return (
        <>
          <b>{event.by}</b> mudou o status
          <StatusBadge status={event.from} />
          <ArrowRightIcon size={12} weight="bold" aria-label="para" />
          <StatusBadge status={event.to} />
        </>
      );
    case "stage":
      return (
        <>
          <b>{event.by}</b> moveu para <b>{stageLabel(funnels, event.stage)}</b>
        </>
      );
    case "file":
      return (
        <>
          <b>{event.by}</b> anexou <b>{event.fileName}</b>
        </>
      );
  }
}

/** Atividade do atendimento (entrada, responsável, status, etapas, arquivos) no topo da conversa. */
export function Activity({ lead, history }: { lead: Lead; history: readonly HistoryEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const { funnels } = useFunnels();
  const { members } = useWorkspace();
  if (history.length === 0) return null;

  const ordered = [...history].sort((a, b) => a.at.localeCompare(b.at));
  const visible = expanded ? ordered : ordered.slice(-VISIBLE);
  const hidden = ordered.length - visible.length;

  return (
    <ActivityCard aria-label="Atividade">
      <ActivityHead>
        Atividade
        {(hidden > 0 || expanded) && ordered.length > VISIBLE && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Ver menos" : `Ver tudo (${ordered.length})`}
          </Button>
        )}
      </ActivityHead>
      <ActivityList>
        {visible.map((event) => (
          <ActivityRow key={event.id}>
            <Actor name={event.type === "created" ? lead.name : event.by} lead={lead} team={members} />
            <ActivityText>{describe(event, lead, funnels)}</ActivityText>
            <ActivityTime title={formatDateTime(event.at)}>{formatAgo(event.at)}</ActivityTime>
          </ActivityRow>
        ))}
      </ActivityList>
    </ActivityCard>
  );
}
