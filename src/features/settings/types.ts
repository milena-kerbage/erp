import type { Person } from "@/features/leads/types";

/** O que cada pessoa pode fazer no sistema. */
export type Permission = "admin" | "manager" | "member";

export type Member = Person & {
  id: string;
  email: string;
  phone?: string;
  /** Função no ateliê (ex.: "Modelista"). */
  role: string;
  permission: Permission;
  /** `invited`: convite enviado, ainda não entrou. */
  status: "active" | "invited";
  joinedAt: string;
  lastSeenAt?: string;
};

export type WeekStart = "sunday" | "monday";

export type Preferences = {
  workspaceName: string;
  businessPhone: string;
  businessEmail: string;
  city: string;
  timeZone: string;
  weekStart: WeekStart;
  /** Horário de atendimento (ex.: "09:00" a "18:00"), usado na mensagem de ausência. */
  openingTime: string;
  closingTime: string;
  saturday: boolean;
  /** Conversas */
  enterSends: boolean;
  signMessages: boolean;
  awayMessage: boolean;
  awayText: string;
  /** Leads */
  staleLeadDays: number;
  autoAssign: boolean;
  /** Notificações */
  notifyNewLead: boolean;
  notifyNewMessage: boolean;
  notifyStaleLead: boolean;
  dailySummary: boolean;
};

export type IntegrationId = "whatsapp" | "instagram" | "meta-ads" | "google-calendar" | "gmail" | "google-analytics";

export type IntegrationState = {
  connected: boolean;
  connectedAt?: string;
  /** Conta conectada (ex.: número, @ ou e-mail). */
  account?: string;
};

export type ApiScope = "read" | "write";

export type ApiKey = {
  id: string;
  name: string;
  /** Só o começo e o fim ficam guardados; a chave inteira aparece uma vez. */
  prefix: string;
  last4: string;
  scope: ApiScope;
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
};

export type WebhookEvent =
  | "lead.created"
  | "lead.stage_changed"
  | "message.received"
  | "message.sent"
  | "conversation.resolved";

export type Webhook = {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string;
  createdAt: string;
  lastDelivery?: { at: string; status: number };
};
