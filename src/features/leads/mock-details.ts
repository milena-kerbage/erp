import { defaultFunnels, pickFunnel } from "./funnels";
import { mockLeads } from "./mock";
import type { ChatMessage, ConversationStatus, Lead, LeadDetails, Person } from "./types";

/**
 * DADOS FICTÍCIOS da tela de oportunidade (detalhes e conversas). E-mails usam
 * o domínio reservado example.com. Substituir pela API/WhatsApp.
 */

export type TeamMember = Person & { role: string };

/** Equipe do ateliê (responsáveis pelas oportunidades). EXEMPLOS. */
export const team: TeamMember[] = [
  { name: "Milena Kerbage", seed: "user-milena", role: "Administradora" },
  { name: "Ana Souza", seed: "user-ana", role: "Atendimento" },
  { name: "Júlia Ramos", seed: "user-julia", role: "Modelista" },
  { name: "Beatriz Lima", seed: "user-beatriz", role: "Costureira" },
];

/** Usuária logada (placeholder até a autenticação). */
export const teamMember: TeamMember = team[0];

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".");

const cityByAreaCode: Record<string, string> = {
  "11": "São Paulo, SP",
  "19": "Campinas, SP",
  "21": "Rio de Janeiro, RJ",
  "31": "Belo Horizonte, MG",
};

/** Tipo de evento de cada lead de exemplo (o resto é casamento). */
const eventTypeByLead: Record<string, string> = {
  "lead-002": "Festa",
  "lead-005": "Formatura",
  "lead-008": "Festa",
  "lead-012": "Formatura",
  "lead-004": "Festa de 15 anos",
  "lead-013": "Festa de 15 anos",
  "lead-010": "Festa de 15 anos",
};

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Detalhes plausíveis a partir do card, para os leads sem dados próprios. */
function buildDetails(lead: Lead): LeadDetails {
  const handle = slug(lead.name);
  const source = lead.tags.includes("Instagram")
    ? "Instagram"
    : lead.tags.includes("Indicação")
      ? "Indicação"
      : "Site";
  const funnel = pickFunnel(defaultFunnels, lead.funnelId);
  const firstStage = funnel.stages[0]?.id;

  return {
    email: `${handle}@example.com`,
    instagram: `@${handle}`,
    city: cityByAreaCode[lead.phone.slice(0, 2)],
    eventType: eventTypeByLead[lead.id] ?? "Casamento",
    eventDate: addDays(lead.createdAt, 96),
    owner: teamMember,
    source,
    lastContactAt: lead.createdAt,
    links: [],
    campaign:
      source === "Instagram"
        ? {
            utmSource: "instagram",
            utmMedium: "paid_social",
            utmCampaign: `${lead.funnelId}-primavera-2026`,
            utmContent: "reels-colecao",
            landingPage: `https://ateliemilenakerbage.com.br/${lead.funnelId}`,
            referrer: "instagram.com",
            device: "Celular / iOS",
            firstVisitAt: lead.createdAt,
          }
        : undefined,
    attachments: [],
    history: [
      { id: `${lead.id}-h1`, type: "created", source, at: lead.createdAt, by: "Sistema" },
      ...(lead.stage !== firstStage
        ? [
            {
              id: `${lead.id}-h2`,
              type: "stage" as const,
              stage: lead.stage,
              at: lead.createdAt,
              by: teamMember.name,
            },
          ]
        : []),
    ],
  };
}

const helena: LeadDetails = {
  email: "helena.castro@example.com",
  instagram: "@helena.castro",
  city: "Rio de Janeiro, RJ",
  eventType: "Casamento",
  eventDate: "2026-12-12",
  owner: teamMember,
  source: "Instagram",
  lastContactAt: "2026-09-26T10:30:00-03:00",
  links: [
    { label: "Pasta de referências", url: "https://example.com/referencias/helena" },
    { label: "Painel no Pinterest", url: "https://example.com/pinterest/helena-casamento" },
  ],
  campaign: {
    utmSource: "instagram",
    utmMedium: "paid_social",
    utmCampaign: "vendas-primavera-2026",
    utmContent: "reels-vestido-sereia",
    utmTerm: "vestido de noiva sob medida",
    landingPage: "https://ateliemilenakerbage.com.br/noivas",
    referrer: "instagram.com",
    ad: "Reels / Vestido sereia com renda",
    device: "Celular / iOS",
    firstVisitAt: "2026-09-26T09:31:00-03:00",
  },
  attachments: [
    {
      id: "att-1",
      name: "referencia-vestido.jpg",
      size: 21_700,
      type: "image/jpeg",
      addedAt: "2026-09-26T10:21:00-03:00",
      url: "/mock/referencia-vestido.jpg",
    },
    {
      id: "att-2",
      name: "medidas-helena.pdf",
      size: 126_000,
      type: "application/pdf",
      addedAt: "2026-09-26T10:40:00-03:00",
    },
  ],
  history: [
    { id: "h-1", type: "created", source: "Instagram", at: "2026-09-25T21:40:00-03:00", by: "Sistema" },
    { id: "h-1b", type: "owner", owner: "Milena Kerbage", at: "2026-09-26T09:50:00-03:00", by: "Ana Souza" },
    { id: "h-1c", type: "status", from: "open", to: "progress", at: "2026-09-26T09:52:00-03:00", by: "Milena Kerbage" },
    { id: "h-2", type: "file", fileName: "referencia-vestido.jpg", at: "2026-09-26T10:21:00-03:00", by: "Helena Castro" },
    { id: "h-3", type: "file", fileName: "medidas-helena.pdf", at: "2026-09-26T10:40:00-03:00", by: teamMember.name },
  ],
};

export const mockDetails: Record<string, LeadDetails> = Object.fromEntries(
  mockLeads.map((lead) => [lead.id, lead.id === "lead-003" ? helena : buildDetails(lead)]),
);

const person = (lead: Lead): Person => ({ name: lead.name, seed: lead.id, avatarUrl: lead.photoUrl });
const leadById = (id: string) => mockLeads.find((lead) => lead.id === id)!;

const helenaLead = person(leadById("lead-003"));
const mariana = person(leadById("lead-001"));
const carolina = person(leadById("lead-015"));
const beatriz = person(leadById("lead-002"));
const camila = person(leadById("lead-004"));
const sofia = person(leadById("lead-006"));
const laura = person(leadById("lead-009"));
const ana = team[1];

/** Andamento de cada conversa. EXEMPLOS. */
export const mockConversationStatus: Record<string, ConversationStatus> = {
  "lead-003": "progress",
  "lead-001": "progress",
  "lead-015": "open",
  "lead-002": "open",
  "lead-004": "open",
  "lead-006": "resolved",
  "lead-009": "progress",
};

export const mockMessages: Record<string, ChatMessage[]> = {
  "lead-003": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: helenaLead,
      text: "Oi! Vi o reels do vestido sereia e me apaixonei 😍 Vocês fazem sob medida?",
      at: "2026-09-25T21:40:00-03:00",
    },
    {
      id: "m2",
      direction: "out",
      kind: "message",
      author: teamMember,
      text: "Oi, Helena! Que alegria 💚 Fazemos sim, todos os vestidos são sob medida. Para quando é o casamento?",
      at: "2026-09-26T09:52:00-03:00",
      status: "read",
    },
    {
      id: "m3",
      direction: "in",
      kind: "message",
      author: helenaLead,
      text: "Dia 12 de dezembro! Ainda dá tempo?",
      at: "2026-09-26T10:03:00-03:00",
    },
    {
      id: "m4",
      direction: "in",
      kind: "message",
      author: helenaLead,
      text: "Queria algo com renda e costas abertas",
      at: "2026-09-26T10:03:30-03:00",
    },
    {
      id: "m5",
      direction: "out",
      kind: "note",
      author: teamMember,
      text: "Prazo apertado: primeira prova até 15/10. Veio por indicação da Sofia Andrade.",
      at: "2026-09-26T10:10:00-03:00",
    },
    {
      id: "m6",
      direction: "out",
      kind: "message",
      author: teamMember,
      text: "Dá sim! Para dezembro, o ideal é fazermos a primeira prova até meados de outubro. Posso te mandar alguns modelos com renda e costas abertas?",
      at: "2026-09-26T10:15:00-03:00",
      status: "read",
    },
    {
      id: "m7",
      direction: "in",
      kind: "message",
      author: helenaLead,
      text: "Sim! Separei essa referência",
      at: "2026-09-26T10:21:00-03:00",
      attachments: [
        {
          id: "att-1",
          name: "referencia-vestido.jpg",
          size: 21_700,
          type: "image/jpeg",
          addedAt: "2026-09-26T10:21:00-03:00",
          url: "/mock/referencia-vestido.jpg",
        },
      ],
    },
    {
      id: "m7b",
      direction: "in",
      kind: "message",
      author: helenaLead,
      text: "",
      at: "2026-09-26T10:24:00-03:00",
      attachments: [
        {
          id: "att-audio-1",
          name: "audio-helena.wav",
          size: 256_044,
          type: "audio/wav",
          addedAt: "2026-09-26T10:24:00-03:00",
          url: "/mock/audio-helena.wav",
          duration: 8,
        },
      ],
    },
    {
      id: "m8",
      direction: "out",
      kind: "message",
      author: teamMember,
      text: "Perfeita! Vou montar o orçamento com base nela e te envio hoje ainda 😊",
      at: "2026-09-26T10:30:00-03:00",
      status: "delivered",
    },
  ],
  "lead-001": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: mariana,
      text: "Boa tarde! Queria saber valores de vestido de noiva",
      at: "2026-09-25T14:20:00-03:00",
    },
    {
      id: "m2",
      direction: "out",
      kind: "message",
      author: teamMember,
      text: "Boa tarde, Mariana! Os valores variam conforme tecido e modelagem. Podemos agendar uma conversa para entender o que você imagina?",
      at: "2026-09-25T14:42:00-03:00",
      status: "read",
    },
  ],
  "lead-015": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: carolina,
      text: "Oi, tudo bem? Vocês têm horário para prova no sábado?",
      at: "2026-09-23T19:05:00-03:00",
    },
  ],
  "lead-002": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: beatriz,
      text: "Bom dia! Sou madrinha de um casamento em novembro",
      at: "2026-09-27T08:12:00-03:00",
    },
    {
      id: "m2",
      direction: "in",
      kind: "message",
      author: beatriz,
      text: "Vocês alugam vestido longo? A cor da madrinha é verde oliva",
      at: "2026-09-27T08:13:00-03:00",
    },
  ],
  "lead-004": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: camila,
      text: "Oi! Minha filha faz 15 anos em março e queria um vestido de princesa ✨",
      at: "2026-09-26T19:40:00-03:00",
    },
  ],
  "lead-006": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: sofia,
      text: "Recebi o orçamento, amei! Pode reservar a data da primeira prova?",
      at: "2026-09-22T16:02:00-03:00",
    },
    {
      id: "m2",
      direction: "out",
      kind: "message",
      author: teamMember,
      text: "Reservado, Sofia! Primeira prova dia 06/10 às 15h. Te espero no ateliê 💚",
      at: "2026-09-22T16:20:00-03:00",
      status: "read",
    },
    {
      id: "m3",
      direction: "in",
      kind: "message",
      author: sofia,
      text: "Perfeito, obrigada!",
      at: "2026-09-22T16:21:00-03:00",
    },
    {
      id: "m4",
      direction: "out",
      kind: "note",
      author: teamMember,
      text: "Prova confirmada na agenda. Pode encerrar.",
      at: "2026-09-22T16:30:00-03:00",
    },
  ],
  "lead-009": [
    {
      id: "m1",
      direction: "in",
      kind: "message",
      author: laura,
      text: "Consegue fazer em 3x no cartão?",
      at: "2026-09-24T11:15:00-03:00",
    },
    {
      id: "m2",
      direction: "out",
      kind: "message",
      author: ana,
      text: "Consigo sim, Laura! Em até 3x sem juros. Te mando o contrato por aqui?",
      at: "2026-09-24T11:32:00-03:00",
      status: "read",
    },
  ],
};
