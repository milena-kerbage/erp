export type Lead = {
  id: string;
  revision?: number;
  /** Funil ao qual o lead pertence. */
  funnelId: string;
  /** Etapa dentro do funil (ver `funnels.ts`). */
  stage: string;
  name: string;
  /** Só dígitos, com DDD (ex.: "11987654321"). */
  phone: string;
  /** Valor do orçamento, em reais. */
  budget: number;
  photoUrl?: string | null;
  tags: string[];
  /** ISO 8601. */
  createdAt: string;
};

export type LeadSort = "recent" | "oldest" | "budget-desc" | "budget-asc" | "name";

export type Person = {
  name: string;
  /** Base do avatar ilustrado quando não há foto. */
  seed: string;
  avatarUrl?: string | null;
};

export type Attachment = {
  id: string;
  name: string;
  /** Em bytes. */
  size: number;
  /** MIME type. */
  type: string;
  addedAt: string;
  /** Rota autenticada para abrir/baixar o arquivo persistido. */
  url?: string;
  /** Duração em segundos (áudio e vídeo). */
  duration?: number;
};

/** Parâmetros de rastreamento da origem do lead. */
export type Campaign = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  ad?: string;
  device?: string;
  firstVisitAt?: string;
};

/** Andamento do atendimento da conversa. */
export type ConversationStatus = "open" | "progress" | "resolved";

export type HistoryEvent = {
  id: string;
  at: string;
  by: string;
} & (
  | { type: "created"; source: string }
  | { type: "stage"; stage: string }
  | { type: "file"; fileName: string }
  | { type: "status"; from: ConversationStatus; to: ConversationStatus }
  | { type: "owner"; owner: string }
);

/** Dados completos da oportunidade (tela de detalhe). */
export type LeadDetails = {
  email?: string;
  instagram?: string;
  city?: string;
  eventType?: string;
  /** Data do evento (AAAA-MM-DD). */
  eventDate?: string;
  owner: Person;
  source: string;
  lastContactAt?: string;
  links: { label: string; url: string }[];
  campaign?: Campaign;
  attachments: Attachment[];
  history: HistoryEvent[];
};

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type ChatMessage = {
  id: string;
  /** in: do lead · out: da equipe. */
  direction: "in" | "out";
  /** note: nota interna, só a equipe vê. */
  kind: "message" | "note";
  author: Person;
  text: string;
  at: string;
  status?: MessageStatus;
  attachments?: Attachment[];
};
