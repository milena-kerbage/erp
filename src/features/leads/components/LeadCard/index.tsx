"use client";

import { CaretUpDownIcon, PhoneIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { KANBAN_DRAG_TYPE } from "@/components/ui/Kanban";
import { Select } from "@/components/ui/Select";
import { Tag, toneFor } from "@/components/ui/Tag";
import { formatBudget, formatPhone } from "../../format";
import type { FunnelStage } from "../../funnels";
import type { Lead } from "../../types";
import { StageStep } from "../StageStep";
import {
  Budget,
  Card,
  CardLink,
  Identity,
  MoveHeader,
  MoveHeaderCaption,
  MoveHeaderName,
  MoveHeaderTexts,
  Name,
  Phone,
  Tags,
  Top,
} from "./styles";

/** Quantas etiquetas aparecem antes do "+N". */
const MAX_TAGS = 2;

type LeadCardProps = {
  lead: Lead;
  /** Etapas do funil do lead (opções do "Mover para"). */
  stages: readonly FunnelStage[];
  dragging: boolean;
  /** Arrastar ligado (no celular fica desligado: a etapa muda pelo "Mover para"). */
  draggable?: boolean;
  onMove: (stage: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function LeadCard({
  lead,
  stages,
  dragging,
  draggable = true,
  onMove,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === lead.stage);
  const currentStage = stages[currentIndex];
  const visibleTags = lead.tags.slice(0, MAX_TAGS);
  const hiddenTags = lead.tags.slice(MAX_TAGS);

  return (
    <Card
      $dragging={dragging}
      aria-label={lead.name}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData(KANBAN_DRAG_TYPE, lead.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <Top>
        <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="md" shape="circle" />
        <Identity>
          <Name>
            {/* O link cobre o card todo; draggable=false deixa o arrastar para o card */}
            <CardLink href={`/leads/${lead.id}`} draggable={false}>
              {lead.name}
            </CardLink>
          </Name>
          <Phone>
            <PhoneIcon size={12} aria-hidden />
            {formatPhone(lead.phone)}
          </Phone>
        </Identity>

        {/* Alternativa ao arrastar: funciona no teclado */}
        <Select
          label={`Etapa de ${lead.name}`}
          heading="Mover para"
          align="end"
          width="15rem"
          value={lead.stage}
          onChange={onMove}
          header={
            <MoveHeader>
              <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="sm" shape="circle" />
              <MoveHeaderTexts>
                <MoveHeaderName>{lead.name}</MoveHeaderName>
                <MoveHeaderCaption>{currentStage?.label}</MoveHeaderCaption>
              </MoveHeaderTexts>
            </MoveHeader>
          }
          options={stages.map((stage, index) => ({
            value: stage.id,
            label: stage.label,
            leading: (
              <StageStep
                tone={stage.tone}
                state={index < currentIndex ? "past" : index === currentIndex ? "current" : "future"}
                first={index === 0}
                last={index === stages.length - 1}
              />
            ),
            trailing: index === currentIndex ? <Badge tone={stage.tone}>Atual</Badge> : undefined,
          }))}
          trigger={(props) => (
            <IconButton
              {...props}
              icon={CaretUpDownIcon}
              label="Mover para outra etapa"
              variant="ghost"
              size="sm"
              tooltip={false}
            />
          )}
        />
      </Top>

      <Budget>{formatBudget(lead.budget)}</Budget>

      {lead.tags.length > 0 && (
        <Tags>
          {visibleTags.map((tag) => (
            <Tag key={tag} tone={toneFor(tag)}>
              {tag}
            </Tag>
          ))}
          {hiddenTags.length > 0 && (
            <Tag variant="outline" title={hiddenTags.join(", ")}>
              +{hiddenTags.length}
            </Tag>
          )}
        </Tags>
      )}
    </Card>
  );
}
