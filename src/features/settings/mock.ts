import { team } from "@/features/leads/mock-details";
import type { ApiKey, IntegrationId, IntegrationState, Member, Preferences, Webhook } from "./types";

/**
 * DADOS FICTÍCIOS das configurações (equipe, integrações, API). E-mails usam
 * o domínio reservado example.com. Substituir pela API.
 */

const emails = ["milena", "ana", "julia", "beatriz"];

export const mockMembers: Member[] = [
  ...team.map((person, index) => ({
    ...person,
    id: person.seed,
    email: `${emails[index]}@example.com`,
    permission: index === 0 ? ("admin" as const) : index === 1 ? ("manager" as const) : ("member" as const),
    status: "active" as const,
    joinedAt: ["2025-03-10", "2025-06-02", "2025-08-18", "2026-01-12"][index],
    lastSeenAt: [
      "2026-09-27T09:40:00-03:00",
      "2026-09-27T08:15:00-03:00",
      "2026-09-26T17:30:00-03:00",
      "2026-09-19T11:05:00-03:00",
    ][index],
  })),
  {
    id: "user-carla",
    name: "Carla Mendes",
    seed: "user-carla",
    email: "carla@example.com",
    role: "Bordadeira",
    permission: "member",
    status: "invited",
    joinedAt: "2026-09-25",
  },
];

/** Usuária logada (placeholder até a autenticação). */
export const currentUserId = mockMembers[0].id;

export const defaultPreferences: Preferences = {
  workspaceName: "Ateliê Milena Kerbage",
  businessPhone: "21998887766",
  businessEmail: "contato@example.com",
  city: "Rio de Janeiro, RJ",
  timeZone: "America/Sao_Paulo",
  weekStart: "sunday",
  openingTime: "09:00",
  closingTime: "18:00",
  saturday: true,
  enterSends: true,
  signMessages: false,
  awayMessage: true,
  awayText:
    "Oi! Recebemos sua mensagem 💚 Nosso atendimento é de segunda a sábado, das 9h às 18h. Já já te respondemos!",
  staleLeadDays: 3,
  autoAssign: false,
  notifyNewLead: true,
  notifyNewMessage: true,
  notifyStaleLead: true,
  dailySummary: false,
};

export const defaultIntegrations: Record<IntegrationId, IntegrationState> = {
  whatsapp: { connected: false },
  instagram: { connected: true, connectedAt: "2026-08-02T10:00:00-03:00", account: "@milenakerbageatelie" },
  "meta-ads": { connected: false },
  "google-calendar": { connected: false },
  gmail: { connected: false },
  "google-analytics": { connected: false },
};

export const mockApiKeys: ApiKey[] = [
  {
    id: "key-site",
    name: "Formulário do site",
    prefix: "mk_live_",
    last4: "3f9a",
    scope: "write",
    createdAt: "2026-07-14T10:00:00-03:00",
    createdBy: "Milena Kerbage",
    lastUsedAt: "2026-09-26T21:40:00-03:00",
  },
];

export const mockWebhooks: Webhook[] = [
  {
    id: "wh-planilha",
    url: "https://hooks.example.com/atelie/novos-leads",
    events: ["lead.created", "lead.stage_changed"],
    active: true,
    secret: "whsec_2c1f0d7a9b4e",
    createdAt: "2026-08-20T14:00:00-03:00",
    lastDelivery: { at: "2026-09-27T08:13:00-03:00", status: 200 },
  },
];
