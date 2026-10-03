import type { Funnel } from "@/features/leads/funnels";
import type { ChatMessage, ConversationStatus, Lead, LeadDetails } from "@/features/leads/types";

/**
 * Números do painel calculados a partir do estado atual (leads, fichas e
 * conversas). Tudo relativo a `now`, que vem do navegador (o servidor não
 * sabe o fuso de quem está vendo).
 */

export type Period = 7 | 14 | 30;

export const periods: readonly Period[] = [7, 14, 30];

export const periodLabels: Record<Period, string> = {
  7: "Últimos 7 dias",
  14: "Últimos 14 dias",
  30: "Últimos 30 dias",
};

const MINUTE = 60_000;

export function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Dias do período, do mais antigo até hoje (`back` períodos para trás). */
export function periodDays(now: Date, length: number, back = 0) {
  const last = addDays(startOfDay(now), -length * back);
  return Array.from({ length }, (_, index) => addDays(last, index - length + 1));
}

/** Janela [início, fim) do período atual (back 0) ou do anterior (back 1). */
function windowOf(now: Date, length: number, back = 0) {
  const days = periodDays(now, length, back);
  return { start: days[0].getTime(), end: addDays(days[days.length - 1], 1).getTime() };
}

const inWindow = (iso: string, window: { start: number; end: number }) => {
  const time = new Date(iso).getTime();
  return time >= window.start && time < window.end;
};

/** Variação percentual (null quando não há base para comparar). */
export function change(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/* ---------- Indicadores ---------- */

export type Kpi = {
  value: number;
  /** Mesmo número no período anterior (null = sem dados para comparar). */
  previous: number | null;
  /** Um ponto por dia do período (null = dia sem dado). */
  series: (number | null)[];
};

/** Leads que entraram no período. */
export function newLeadsKpi(leads: readonly Lead[], now: Date, length: Period): Kpi {
  const current = windowOf(now, length);
  const previous = windowOf(now, length, 1);
  const days = periodDays(now, length);
  return {
    value: leads.filter((lead) => inWindow(lead.createdAt, current)).length,
    previous: leads.filter((lead) => inWindow(lead.createdAt, previous)).length,
    series: days.map((day) => leads.filter((lead) => dayKey(new Date(lead.createdAt)) === dayKey(day)).length),
  };
}

type Reply = { at: string; minutes: number };

/**
 * Tempo até a primeira resposta da equipe para cada mensagem (ou sequência de
 * mensagens) recebida. Notas internas não contam como resposta.
 */
export function replies(messages: Record<string, readonly ChatMessage[]>) {
  const list: Reply[] = [];
  for (const conversation of Object.values(messages)) {
    let waitingSince: string | null = null;
    for (const message of conversation) {
      if (message.kind === "note") continue;
      if (message.direction === "in") waitingSince ??= message.at;
      else if (waitingSince) {
        list.push({
          at: waitingSince,
          minutes: (new Date(message.at).getTime() - new Date(waitingSince).getTime()) / MINUTE,
        });
        waitingSince = null;
      }
    }
  }
  return list;
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/** Tempo médio até a primeira resposta, em minutos. */
export function responseKpi(messages: Record<string, readonly ChatMessage[]>, now: Date, length: Period): Kpi {
  const all = replies(messages);
  const current = windowOf(now, length);
  const previous = windowOf(now, length, 1);
  const days = periodDays(now, length);
  return {
    value: average(all.filter((reply) => inWindow(reply.at, current)).map((reply) => reply.minutes)) ?? 0,
    previous: average(all.filter((reply) => inWindow(reply.at, previous)).map((reply) => reply.minutes)),
    series: days.map((day) =>
      average(all.filter((reply) => dayKey(new Date(reply.at)) === dayKey(day)).map((reply) => reply.minutes)),
    ),
  };
}

/** Funil de vendas (o primeiro, se "vendas" tiver sido renomeado/removido). */
export const salesFunnel = (funnels: readonly Funnel[]) => funnels.find((funnel) => funnel.id === "vendas") ?? funnels[0];

/** Leads de vendas que ainda não fecharam (a última etapa é o fechamento). */
function openDeals(leads: readonly Lead[], funnel: Funnel | undefined) {
  if (!funnel) return [];
  const closed = funnel.stages[funnel.stages.length - 1]?.id;
  return leads.filter((lead) => lead.funnelId === funnel.id && lead.stage !== closed);
}

/** Valor em negociação no funil de vendas (e como ele cresceu dia a dia). */
export function pipelineKpi(leads: readonly Lead[], funnels: readonly Funnel[], now: Date, length: Period): Kpi {
  const open = openDeals(leads, salesFunnel(funnels));
  const start = windowOf(now, length).start;
  const sum = (list: readonly Lead[]) => list.reduce((total, lead) => total + lead.budget, 0);
  const before = open.filter((lead) => new Date(lead.createdAt).getTime() < start);
  return {
    value: sum(open),
    previous: before.length ? sum(before) : null,
    series: periodDays(now, length).map((day) =>
      sum(open.filter((lead) => new Date(lead.createdAt).getTime() < addDays(day, 1).getTime())),
    ),
  };
}

/* ---------- Séries dos gráficos ---------- */

export type MonthDay = {
  date: Date;
  /** Soma dos orçamentos dos leads que chegaram no dia. */
  value: number;
  count: number;
  /** Dia que ainda não chegou. */
  future: boolean;
};

const createdOn = (lead: Lead, date: Date) => dayKey(new Date(lead.createdAt)) === dayKey(date);
const sumBudgets = (list: readonly Lead[]) => list.reduce((total, lead) => total + lead.budget, 0);

/** Todos os dias do mês de `now`, com o que entrou no funil em cada um. */
export function intakeOfMonth(leads: readonly Lead[], now: Date): MonthDay[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const length = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(now).getTime();
  return Array.from({ length }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const list = leads.filter((lead) => createdOn(lead, date));
    return { date, value: sumBudgets(list), count: list.length, future: date.getTime() > today };
  });
}

/** Mesmo trecho do mês anterior (do dia 1 até o dia de hoje), para comparar sem distorcer. */
export function previousMonthToDate(leads: readonly Lead[], now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = Math.min(now.getDate(), new Date(year, month, 0).getDate());
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month - 1, lastDay + 1).getTime();
  const list = leads.filter((lead) => {
    const time = new Date(lead.createdAt).getTime();
    return time >= start && time < end;
  });
  return { value: sumBudgets(list), count: list.length, until: new Date(year, month - 1, lastDay) };
}

const inMonthOf = (iso: string, now: Date) => {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export type SourceRow = {
  source: string;
  count: number;
  /** Soma dos orçamentos. */
  value: number;
  /** Quantos já viraram cliente (funil Clientes ou última etapa de vendas). */
  converted: number;
};

/** Leads do mês por origem, do canal que mais traz para o que menos traz. */
export function sourcesOfMonth(
  leads: readonly Lead[],
  details: Record<string, LeadDetails>,
  funnels: readonly Funnel[],
  now: Date,
): SourceRow[] {
  const sales = salesFunnel(funnels);
  const closed = sales?.stages[sales.stages.length - 1]?.id;
  const isClient = (lead: Lead) => lead.funnelId === "clientes" || (lead.funnelId === sales?.id && lead.stage === closed);
  const rows = new Map<string, SourceRow>();
  for (const lead of leads.filter((item) => inMonthOf(item.createdAt, now))) {
    const source = details[lead.id]?.source || "Outro";
    const row = rows.get(source) ?? { source, count: 0, value: 0, converted: 0 };
    row.count += 1;
    row.value += lead.budget;
    if (isClient(lead)) row.converted += 1;
    rows.set(source, row);
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.value - a.value);
}

export type StageValue = { id: string; label: string; value: number; count: number };

/** Valor e quantidade de leads em cada etapa de um funil. */
export function valueByStage(leads: readonly Lead[], funnel: Funnel): StageValue[] {
  return funnel.stages.map((stage) => {
    const list = leads.filter((lead) => lead.funnelId === funnel.id && lead.stage === stage.id);
    return {
      id: stage.id,
      label: stage.label,
      value: list.reduce((total, lead) => total + lead.budget, 0),
      count: list.length,
    };
  });
}

/* ---------- Recorte Hoje / Mês ---------- */

export type Scope = "today" | "month";

export const scopeLabels: Record<Scope, string> = { today: "Hoje", month: "Mês" };

/** Janela do recorte: de hoje 0h ou do dia 1 do mês até agora. */
export function scopeWindow(now: Date, scope: Scope) {
  const start = scope === "today" ? startOfDay(now) : new Date(now.getFullYear(), now.getMonth(), 1);
  const days = scope === "today" ? 1 : now.getDate();
  return { start: start.getTime(), end: now.getTime() + 60_000, days };
}

type Window = { start: number; end: number };

const within = (iso: string | undefined, window: Window) => {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= window.start && time < window.end;
};

export const leadsIn = (leads: readonly Lead[], window: Window) => leads.filter((lead) => within(lead.createdAt, window));

/** Já é cliente: está no funil Clientes ou na última etapa de vendas. */
export function isClient(lead: Lead, funnels: readonly Funnel[]) {
  const sales = salesFunnel(funnels);
  return lead.funnelId === "clientes" || (lead.funnelId === sales?.id && lead.stage === sales.stages[sales.stages.length - 1]?.id);
}

/** Já foi atendido: saiu da primeira etapa de vendas (ou está em outro funil). */
export function isAttended(lead: Lead, funnels: readonly Funnel[]) {
  const sales = salesFunnel(funnels);
  return lead.funnelId !== sales?.id || lead.stage !== sales.stages[0]?.id;
}

export const repliesIn = (messages: Record<string, readonly ChatMessage[]>, window: Window) =>
  replies(messages).filter((reply) => within(reply.at, window));

/** Leads sem contato há `days` dias ou mais (fora os que já são clientes). */
export function staleLeads(
  leads: readonly Lead[],
  details: Record<string, LeadDetails>,
  funnels: readonly Funnel[],
  now: Date,
  days = 7,
) {
  return leads.filter((lead) => {
    if (isClient(lead, funnels)) return false;
    const last = details[lead.id]?.lastContactAt ?? lead.createdAt;
    return now.getTime() - new Date(last).getTime() >= days * 86_400_000;
  });
}

/* ---------- Atendimento ---------- */

export type AttentionRow = {
  lead: Lead;
  details?: LeadDetails;
  status: ConversationStatus;
  last?: ChatMessage;
  /** Desde quando a cliente espera resposta (null = já respondida). */
  waitingSince: string | null;
};

/** Conversas em ordem de urgência: quem espera resposta há mais tempo, depois a mais recente. */
export function attentionRows(
  leads: readonly Lead[],
  details: Record<string, LeadDetails>,
  messages: Record<string, readonly ChatMessage[]>,
  statuses: Record<string, ConversationStatus>,
) {
  return leads
    .filter((lead) => (messages[lead.id]?.length ?? 0) > 0)
    .map<AttentionRow>((lead) => {
      const conversation = (messages[lead.id] ?? []).filter((message) => message.kind === "message");
      let waitingSince: string | null = null;
      for (const message of conversation) {
        if (message.direction === "in") waitingSince ??= message.at;
        else waitingSince = null;
      }
      const status = statuses[lead.id] ?? "open";
      return {
        lead,
        details: details[lead.id],
        status,
        last: conversation[conversation.length - 1],
        // Conversa resolvida não espera resposta (ex.: "obrigada!")
        waitingSince: status === "resolved" ? null : waitingSince,
      };
    })
    .sort((a, b) => {
      if (a.waitingSince && b.waitingSince) return a.waitingSince.localeCompare(b.waitingSince);
      if (a.waitingSince || b.waitingSince) return a.waitingSince ? -1 : 1;
      return (b.last?.at ?? "").localeCompare(a.last?.at ?? "");
    });
}

/* ---------- Formatação ---------- */

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatMoney = (value: number) => currency.format(value);

/** Eixos: "R$ 5 mil", "R$ 12,5 mil". */
export const formatMoneyShort = (value: number) => (value >= 1000 ? compactCurrency.format(value) : currency.format(value));

/** "38 min", "2h 10min", "1d 3h". */
export function formatDuration(minutes: number) {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${Math.max(rounded, 0)} min`;
  const hours = Math.floor(rounded / 60);
  if (hours < 24) return rounded % 60 ? `${hours}h ${rounded % 60}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

/** "+8,2%" / "-1,3%". */
export function formatChange(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const longDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const monthDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });

/** "Seg", "Ter"... */
export const formatWeekday = (date: Date) => {
  const text = weekdayShort.format(date).replace(".", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** "21/09". */
export const formatDayMonth = (date: Date) => dayMonth.format(date);

/** "sáb, 27 de set" (tooltip). */
export const formatLongDay = (date: Date) => longDay.format(date).replace(/\./g, "");

/** "Setembro de 2026". */
export const formatMonth = (date: Date) => {
  const text = monthYear.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** "27 de agosto". */
export const formatMonthDay = (date: Date) => monthDay.format(date);

const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" });

/** "agosto". */
export const formatMonthName = (date: Date) => monthName.format(date);
