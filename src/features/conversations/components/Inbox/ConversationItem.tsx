"use client";

import { useTheme } from "@emotion/react";
import {
  CameraIcon,
  CheckIcon,
  ChecksIcon,
  ClockIcon,
  FileIcon,
  LockSimpleIcon,
  MicrophoneIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { formatListTime } from "@/lib/format";
import { formatDuration } from "@/lib/waveform";
import type { ChatMessage, ConversationStatus, Lead } from "@/features/leads/types";
import { findStatus, StatusIcon } from "../../status";
import { Item, ItemName, ItemPreview, ItemRow, ItemTexts, ItemTime, ItemTrail, UnreadBadge } from "./styles";

export type Conversation = {
  lead: Lead;
  last?: ChatMessage;
  unread: number;
  status: ConversationStatus;
  /** Última atividade (mensagem ou criação do lead). */
  at: string;
};

/** Prévia da última mensagem, como no WhatsApp: status do envio, tipo de anexo e texto. */
function MessagePreview({ message }: { message?: ChatMessage }) {
  const theme = useTheme();
  if (!message) return <span>Nenhuma mensagem ainda</span>;

  const files = message.attachments ?? [];
  const image = files.find((file) => file.type.startsWith("image/"));
  const audio = files.find((file) => file.type.startsWith("audio/"));
  const other = files.find((file) => file !== image && file !== audio);

  const text =
    message.text || (image ? "Foto" : audio ? `Áudio (${formatDuration(audio.duration ?? 0)})` : (other?.name ?? ""));

  const status = message.direction === "out" && message.kind === "message" ? message.status : undefined;

  return (
    <>
      {message.kind === "note" && (
        <>
          <LockSimpleIcon size={13} weight="fill" color={theme.tones.yellow.fg} aria-hidden />
          <VisuallyHidden>Nota interna:</VisuallyHidden>
        </>
      )}
      {status === "sending" && <ClockIcon size={14} aria-hidden />}
      {status === "sent" && <CheckIcon size={14} weight="bold" aria-hidden />}
      {(status === "delivered" || status === "read") && (
        <ChecksIcon
          size={15}
          weight="bold"
          color={status === "read" ? theme.colors.chat.read : undefined}
          aria-hidden
        />
      )}
      {image && <CameraIcon size={14} aria-hidden />}
      {audio && <MicrophoneIcon size={14} aria-hidden />}
      {other && !image && !audio && <FileIcon size={14} aria-hidden />}
      <span>{text}</span>
    </>
  );
}

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
};

export function ConversationItem({ conversation, selected }: ConversationItemProps) {
  const { lead, last, unread, status, at } = conversation;
  const hasUnread = unread > 0;

  return (
    <li>
      <Item
        href={`/conversas?c=${lead.id}`}
        scroll={false}
        $selected={selected}
        aria-current={selected ? "true" : undefined}
      >
        <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="md" />
        <ItemTexts>
          <ItemRow>
            <ItemName $unread={hasUnread}>{lead.name}</ItemName>
            <ItemTime $unread={hasUnread}>{formatListTime(at)}</ItemTime>
          </ItemRow>
          <ItemRow>
            <ItemPreview $unread={hasUnread}>
              <MessagePreview message={last} />
            </ItemPreview>
            <ItemTrail>
              {hasUnread && (
                <UnreadBadge>
                  {unread}
                  <VisuallyHidden>{unread === 1 ? " mensagem não lida" : " mensagens não lidas"}</VisuallyHidden>
                </UnreadBadge>
              )}
              <StatusIcon status={status} />
              <VisuallyHidden>{findStatus(status).label}</VisuallyHidden>
            </ItemTrail>
          </ItemRow>
        </ItemTexts>
      </Item>
    </li>
  );
}
