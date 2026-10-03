/**
 * Notificações de exemplo (a equipe, os leads e o sistema). Datas relativas
 * a agora. Substituir pela API.
 */

export type NotificationTab = "inbox" | "general";

export type NotificationActor =
  | { kind: "member"; seed: string }
  | { kind: "lead"; leadId: string }
  | { kind: "system" };

export type AppNotification = {
  id: string;
  tab: NotificationTab;
  actor: NotificationActor;
  /** Frase: <quem> <verbo> <alvo> <complemento>. */
  who: string;
  verb: string;
  target?: string;
  suffix?: string;
  at: string;
  /** Onde aconteceu (funil, módulo...). */
  context: string;
  href?: string;
  read: boolean;
  archived: boolean;
  file?: string;
  /** Lead novo sem responsável: dá para assumir ou ignorar. */
  claimLeadId?: string;
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const mockNotifications = (): AppNotification[] => [
  {
    id: "n1",
    tab: "inbox",
    actor: { kind: "lead", leadId: "lead-003" },
    who: "Helena Castro",
    verb: "mandou uma mensagem em",
    target: "Conversas",
    at: ago(12),
    context: "Vendas",
    href: "/conversas?c=lead-003",
    read: false,
    archived: false,
  },
  {
    id: "n2",
    tab: "inbox",
    actor: { kind: "member", seed: "user-ana" },
    who: "Ana Souza",
    verb: "atribuiu",
    target: "Beatriz Nogueira",
    suffix: "a você",
    at: ago(125),
    context: "Vendas",
    href: "/leads/lead-002",
    read: false,
    archived: false,
  },
  {
    id: "n3",
    tab: "inbox",
    actor: { kind: "lead", leadId: "lead-004" },
    who: "Camila Ferraz",
    verb: "chegou como lead novo pelo",
    target: "Instagram",
    at: ago(190),
    context: "Vendas",
    href: "/leads/lead-004",
    read: true,
    archived: false,
    claimLeadId: "lead-004",
  },
  {
    id: "n4",
    tab: "inbox",
    actor: { kind: "member", seed: "user-julia" },
    who: "Júlia Ramos",
    verb: "anexou um arquivo em",
    target: "Helena Castro",
    at: ago(200),
    context: "Clientes",
    href: "/leads/lead-003",
    read: true,
    archived: false,
    file: "medidas-helena.pdf",
  },
  {
    id: "n5",
    tab: "inbox",
    actor: { kind: "lead", leadId: "lead-009" },
    who: "Laura Menezes",
    verb: "está sem resposta há",
    target: "3 dias",
    at: ago(1500),
    context: "Vendas",
    href: "/leads/lead-009",
    read: true,
    archived: false,
  },
  {
    id: "g1",
    tab: "general",
    actor: { kind: "system" },
    who: "Novidade:",
    verb: "chegaram as",
    target: "Conversas",
    suffix: "com status e atividade",
    at: ago(2900),
    context: "Novidades",
    href: "/conversas",
    read: false,
    archived: false,
  },
  {
    id: "g2",
    tab: "general",
    actor: { kind: "member", seed: "user-milena" },
    who: "Milena Kerbage",
    verb: "convidou",
    target: "Carla Mendes",
    suffix: "para a equipe",
    at: ago(3000),
    context: "Usuários",
    href: "/configuracoes/usuarios",
    read: true,
    archived: false,
  },
  {
    id: "g3",
    tab: "general",
    actor: { kind: "system" },
    who: "Instagram Direct",
    verb: "foi conectado ao",
    target: "Ateliê Milena Kerbage",
    at: ago(80000),
    context: "Integrações",
    href: "/configuracoes/integracoes",
    read: true,
    archived: false,
  },
  {
    id: "a1",
    tab: "inbox",
    actor: { kind: "lead", leadId: "lead-012" },
    who: "Giovanna Lima",
    verb: "confirmou a retirada do",
    target: "vestido de formatura",
    at: ago(9000),
    context: "Clientes",
    href: "/leads/lead-012",
    read: true,
    archived: true,
  },
];
