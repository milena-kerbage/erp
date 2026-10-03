"use client";

import { Fragment, type ReactNode } from "react";
import styled from "@emotion/styled";
import { CheckIcon, ChecksIcon, ClockIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { transientOptions } from "@/lib/emotion/transient";

export type BubbleDirection = "in" | "out";
export type BubbleStatus = "sending" | "sent" | "delivered" | "read";

type ChatBubbleProps = {
  direction: BubbleDirection;
  /** Nota interna: só a equipe vê. */
  note?: boolean;
  /** Quem escreveu a nota. */
  noteAuthor?: string;
  /** Primeira da sequência: espaço acima e o "rabinho" no canto de cima. */
  first: boolean;
  time: string;
  status?: BubbleStatus;
  /** Imagens (grade de mídia), coladas na borda do balão. */
  media?: ReactNode;
  /** Arquivos (PDF, planilhas...), também colados na borda. */
  files?: ReactNode;
  /** Áudio. */
  audio?: ReactNode;
  text?: string;
};

/** Recuo das mídias/arquivos até a borda do balão. */
const INSET = 3;

/** Onde fica a hora: junto do texto, sobre a imagem ou abaixo do conteúdo. */
type MetaPlacement = "inline" | "overlay" | "below";

const Row = styled("div", transientOptions)<{ $out: boolean; $first: boolean }>`
  display: flex;
  justify-content: ${({ $out }) => ($out ? "flex-end" : "flex-start")};
  margin-top: ${({ theme, $first }) => ($first ? theme.spacing(2.5) : "2px")};
  /* Espaço para o rabinho não encostar na borda da conversa */
  padding: 0 8px;
`;

/**
 * Rabinho: triângulo com a ponta levemente arredondada, na cor do balão,
 * saindo do canto de cima do lado de quem fala.
 */
const TAIL_IN = `path("M8 0 L8 13 L1.1 2.5 Q0 0.4 2.4 0 Z")`;
const TAIL_OUT = `path("M0 0 L0 13 L6.9 2.5 Q8 0.4 5.6 0 Z")`;

const Body = styled("div", transientOptions)<{
  $out: boolean;
  $note: boolean;
  $first: boolean;
  $blocks: boolean;
  $audio: boolean;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${INSET}px;
  max-width: min(34rem, 70%);
  padding: ${({ theme, $blocks, $audio }) =>
    $blocks ? `${INSET}px` : $audio ? theme.spacing(1.5, 2, 1, 1.5) : theme.spacing(1.5, 2, 2, 2.5)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme, $out, $note }) =>
    $note ? theme.tones.yellow.bg : $out ? theme.colors.chat.outgoing : theme.colors.chat.incoming};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;

  ${({ $first, $out }) =>
    $first
      ? `
        border-top-${$out ? "right" : "left"}-radius: 0;

        &::before {
          content: "";
          position: absolute;
          top: 0;
          ${$out ? "right" : "left"}: -8px;
          width: 8px;
          height: 13px;
          background-color: inherit;
          clip-path: ${$out ? TAIL_OUT : TAIL_IN};
        }
      `
      : ""}

  /* Celular: balões mais largos, como no WhatsApp */
  ${({ theme }) => theme.media.md} {
    max-width: 82%;
  }
`;

const Text = styled("p", transientOptions)<{ $fit: boolean }>`
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  /* Com imagem/arquivo, a legenda tem o próprio respiro e quebra na largura
     deles em vez de alargar o balão */
  ${({ theme, $fit }) =>
    $fit
      ? `
        width: 0;
        min-width: 100%;
        padding: ${theme.spacing(1, 1.5, 1.5, 1.75)};
      `
      : ""}

  a {
    color: ${({ theme }) => theme.colors.chat.read};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

/** Reserva o espaço da hora no fim do texto (a hora fica sobreposta). */
const Spacer = styled("span", transientOptions)<{ $width: string }>`
  display: inline-block;
  width: ${({ $width }) => $width};
`;

const Meta = styled("span", transientOptions)<{ $placement: MetaPlacement; $blocks: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6875rem;
  line-height: 1;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};

  ${({ theme, $placement, $blocks }) => {
    if ($placement === "overlay")
      return `
        position: absolute;
        right: 9px;
        bottom: 9px;
        padding: 3px 7px;
        border-radius: ${theme.radii.full};
        background-color: rgba(18, 20, 17, 0.42);
        backdrop-filter: blur(4px);
        color: #fff;
      `;
    if ($placement === "below")
      return `
        align-self: flex-end;
        padding: ${$blocks ? "0 6px 3px" : "0"};
      `;
    return `
      position: absolute;
      right: ${$blocks ? "9px" : "8px"};
      bottom: ${$blocks ? "8px" : "7px"};
    `;
  }}
`;

const Read = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.chat.read};
`;

const NoteLabel = styled("span", transientOptions)<{ $blocks: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ $blocks }) => ($blocks ? "3px 6px 0" : "0 0 2px")};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.tones.yellow.fg};
`;

const statusLabel: Record<BubbleStatus, string> = {
  sending: "Enviando",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
};

function StatusIcon({ status }: { status: BubbleStatus }) {
  const icon =
    status === "sending" ? (
      <ClockIcon size={12} aria-hidden />
    ) : status === "sent" ? (
      <CheckIcon size={12} weight="bold" aria-hidden />
    ) : (
      <ChecksIcon size={13} weight="bold" aria-hidden />
    );

  return (
    <>
      {status === "read" ? <Read>{icon}</Read> : icon}
      <VisuallyHidden>{statusLabel[status]}</VisuallyHidden>
    </>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Texto com links clicáveis. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, index) =>
        part.match(URL_PATTERN) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Mensagem do chat: texto, imagens, áudio, arquivos ou nota interna. */
export function ChatBubble({
  direction,
  note = false,
  noteAuthor,
  first,
  time,
  status,
  media,
  files,
  audio,
  text,
}: ChatBubbleProps) {
  const out = direction === "out";
  const blocks = Boolean(media || files);
  const placement: MetaPlacement = text ? "inline" : media && !files && !audio && !note ? "overlay" : "below";

  return (
    <Row $out={out} $first={first}>
      <Body $out={out} $note={note} $first={first} $blocks={blocks} $audio={Boolean(audio) && !blocks}>
        {note && (
          <NoteLabel $blocks={blocks}>
            <LockSimpleIcon size={11} weight="fill" aria-hidden />
            Nota interna{noteAuthor && ` / ${noteAuthor}`}
          </NoteLabel>
        )}
        {media}
        {files}
        {audio}
        {text && (
          <Text $fit={blocks}>
            <Linkified text={text} />
            <Spacer aria-hidden $width={status ? "3.5rem" : "2.5rem"} />
          </Text>
        )}
        <Meta $placement={placement} $blocks={blocks}>
          {time}
          {status && <StatusIcon status={status} />}
        </Meta>
      </Body>
    </Row>
  );
}

/** Data fixa no topo enquanto se lê as mensagens daquele dia. */
const DateRoot = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.spacing(3)};
  z-index: 2;
  display: flex;
  justify-content: center;
  margin: ${({ theme }) => theme.spacing(5, 0, 1)};
  pointer-events: none;
`;

const DatePill = styled.span`
  padding: ${({ theme }) => theme.spacing(1, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: color-mix(in srgb, ${({ theme }) => theme.palette.neutral[0]} 88%, transparent);
  backdrop-filter: blur(6px);
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  pointer-events: auto;
`;

export function DateDivider({ children }: { children: ReactNode }) {
  return (
    <DateRoot role="separator">
      <DatePill>{children}</DatePill>
    </DateRoot>
  );
}
