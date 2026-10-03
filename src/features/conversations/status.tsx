"use client";

import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { CheckCircleIcon, CircleDashedIcon, CircleHalfIcon, type Icon } from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import type { ConversationStatus } from "@/features/leads/types";

type StatusOption = {
  value: ConversationStatus;
  label: string;
  /** O que significa, para o dropdown ficar bem descrito. */
  description: string;
  icon: Icon;
  tone: Tone;
};

/** Andamento do atendimento: aberta (ninguém pegou), em andamento, resolvida. */
export const conversationStatuses: readonly StatusOption[] = [
  { value: "open", label: "Aberta", description: "Aguardando atendimento", icon: CircleDashedIcon, tone: "blue" },
  { value: "progress", label: "Em andamento", description: "Alguém está atendendo", icon: CircleHalfIcon, tone: "peach" },
  { value: "resolved", label: "Resolvida", description: "Atendimento encerrado", icon: CheckCircleIcon, tone: "green" },
];

export function findStatus(value: ConversationStatus) {
  return conversationStatuses.find((status) => status.value === value) ?? conversationStatuses[0];
}

/** Ícone do status no tom dele. */
export function StatusIcon({ status, size = 16 }: { status: ConversationStatus; size?: number }) {
  const theme = useTheme();
  const option = findStatus(status);
  return <option.icon size={size} weight="bold" color={theme.tones[option.tone].fg} aria-hidden />;
}

const Badge = styled("span", transientOptions)<{ $tone: Tone }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  color: ${({ theme, $tone }) => theme.tones[$tone].fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1;
  white-space: nowrap;
`;

/** Selo do status (ícone + nome), usado na atividade. */
export function StatusBadge({ status }: { status: ConversationStatus }) {
  const option = findStatus(status);
  return (
    <Badge $tone={option.tone}>
      <option.icon size={12} weight="bold" aria-hidden />
      {option.label}
    </Badge>
  );
}
