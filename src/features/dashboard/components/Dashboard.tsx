"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import {
  ArrowRightIcon,
  ChatsCircleIcon,
  ClockCounterClockwiseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  HandCoinsIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  TimerIcon,
  UserPlusIcon,
  WarningCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import { HeaderActions, MobileHeaderSlot } from "@/components/layout/Header/HeaderActions";
import { NarrowOnly, WideOnly } from "@/styles/responsive";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/csv";
import type { Tone } from "@/styles/theme";
import { staggerChildren } from "@/styles/animations";
import { useLeads } from "@/features/leads/store";
import { useCurrentUser, useFunnels } from "@/features/settings/store";
import {
  attentionRows,
  change,
  formatDuration,
  formatLongDay,
  formatMoney,
  formatMoneyShort,
  formatMonthDay,
  formatMonthName,
  intakeOfMonth,
  isAttended,
  isClient,
  leadsIn,
  pipelineKpi,
  previousMonthToDate,
  repliesIn,
  salesFunnel,
  scopeWindow,
  sourcesOfMonth,
  staleLeads,
  valueByStage,
} from "../metrics";
import { ActivityFeed } from "./ActivityFeed";
import { FunnelCard } from "./FunnelCard";
import { AttentionCard } from "./SideCards";
import { SourcesCard } from "./SourcesCard";
import { Card, Delta, Eyebrow, Figure, Help, IconBadge, Note, Segments } from "./ui";

/* ---------- Estilos ---------- */

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  min-width: 0;
`;

const Greeting = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};

  > div {
    flex: 1;
    min-width: 0;
  }

  /* Celular: é o topo da tela (sem header), com os botões à direita */
  ${({ theme }) => theme.media.md} {
    h2 {
      font-size: 1.0625rem !important;
    }

    p {
      font-size: 0.75rem !important;
    }
  }

  h2 {
    font-size: 1.25rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: -0.015em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Aviso discreto de uma linha (o que precisa de atenção agora). */
const Banner = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  padding: ${({ theme }) => theme.spacing(2.5, 4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.colors.interactive.hover};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  > svg:first-of-type {
    flex-shrink: 0;
    color: ${({ theme }) => theme.tones.peach.fg};
  }

  > span {
    flex: 1;
  }

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.pressed};
  }
`;

/**
 * Conteúdo à esquerda, coluna de apoio à direita. As duas colunas têm a mesma
 * altura: a última peça de cada uma estica para fecharem juntas no fim.
 */
const Layout = styled.div`
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) clamp(19rem, 25vw, 24rem);
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: stretch;

  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Column = styled.div`
  ${staggerChildren(6, 60)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
  min-height: 0;
`;

/* Cartão principal */

const Hero = styled(Card)`
  gap: 0;
  padding: 0;
  overflow: hidden;
`;

const HeroTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3, 6)};
  padding: ${({ theme }) => theme.spacing(6)};

  > div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(3)};
  }
`;

const HeroFigure = styled.strong`
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1;
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: normal;
  overflow-wrap: anywhere;
`;

/** Faixa de quatro números com divisórias, como na referência. */
const Strip = styled.dl`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  > div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(1)};
    padding: ${({ theme }) => theme.spacing(4, 6)};
  }

  > div + div {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }

  dt {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  dd {
    font-size: 1.125rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > div:nth-of-type(3) {
      border-left: 0;
    }

    > div:nth-of-type(n + 3) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }
`;

/* Indicadores */

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};

  @media (max-width: 1320px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const MetricRoot = styled(Card)`
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 4, 4, 5)};
`;

const MetricHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};

  > span {
    display: inline-flex;
    flex-wrap: wrap;
    min-width: 0;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1.5)};
    padding-top: ${({ theme }) => theme.spacing(1.5)};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const MetricBottom = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing(2)};
`;

/** Linhas pequenas com barra (ticket por origem). */
const MiniRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};

  > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1, 2)};
  }

  > div > span:first-of-type {
    overflow: hidden;
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  > div > strong {
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }

  > div > span:last-of-type {
    grid-column: 1 / -1;
  }
`;

/** Funil e origem lado a lado; esticam até o fim da coluna. */
const Bottom = styled.div`
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

/* ---------- Partes ---------- */

function MetricCard({
  title,
  help,
  icon,
  tone,
  value,
  unit,
  note,
  ratio,
  ratioLabel,
  footer,
  children,
}: {
  title: string;
  help: string;
  icon: Icon;
  tone: Tone;
  value: ReactNode;
  unit?: string;
  note: ReactNode;
  ratio?: number;
  ratioLabel?: string;
  footer?: ReactNode;
  /** Conteúdo no lugar da barra (ex.: linhas por origem). */
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <MetricRoot aria-label={title}>
      <MetricHead>
        <span>
          {title}
          <Help>{help}</Help>
        </span>
        <IconBadge icon={icon} tone={tone} />
      </MetricHead>
      <Figure>
        {value}
        {unit && <small>{unit}</small>}
      </Figure>
      <MetricBottom>
        <Note>{note}</Note>
        {children ??
          (ratio !== undefined && (
            <Segments ratio={ratio} color={theme.tones[tone].fg} label={ratioLabel ?? `${Math.round(ratio * 100)}%`} />
          ))}
        {footer && <Note>{footer}</Note>}
      </MetricBottom>
    </MetricRoot>
  );
}

const percent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Primeira carga: mesma estrutura com blocos cinza (sem pulo de layout). */
function DashboardSkeleton() {
  const card = (height: string, key: string) => (
    <Card key={key} aria-hidden>
      <Skeleton $width="40%" />
      <Skeleton $height={height} $radius="md" />
    </Card>
  );
  return (
    <Layout aria-busy="true" aria-label="Carregando o painel">
      <Column>
        {card("8rem", "hero")}
        <Metrics>{Array.from({ length: 8 }, (_, index) => card("5.5rem", `m${index}`))}</Metrics>
      </Column>
      <Column>
        {card("14rem", "a")}
        {card("12rem", "b")}
      </Column>
    </Layout>
  );
}

/* ---------- Painel ---------- */

/** Resumo do ateliê no mês numa grade: o valor em destaque, indicadores e o que pede atenção. */
export function Dashboard() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { leads, details, messages, statuses, loading, error, refresh } = useLeads();
  const { funnels, findFunnel } = useFunnels();
  const [funnelId, setFunnelId] = useState<string | undefined>(undefined);
  // Datas dependem do fuso de quem vê: calcula só no navegador
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const data = useMemo(() => {
    if (!now || loading || error) return null;

    /* Mês (cartão principal) */
    const month = intakeOfMonth(leads, now);
    const past = month.filter((day) => !day.future);
    const monthTotal = past.reduce((total, day) => total + day.value, 0);
    const pace = past.length ? monthTotal / past.length : 0;

    /* Indicadores do mês */
    const span = scopeWindow(now, "month");
    const fresh = leadsIn(leads, span);
    const attended = fresh.filter((lead) => isAttended(lead, funnels)).length;
    const won = fresh.filter((lead) => isClient(lead, funnels));
    const wonValue = won.reduce((total, lead) => total + lead.budget, 0);
    const ticket = fresh.length ? monthTotal / fresh.length : 0;
    const sources = sourcesOfMonth(leads, details, funnels, now);
    const ticketBySource = sources
      .map((row) => ({ source: row.source, average: row.value / row.count }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 2);
    const answers = repliesIn(messages, span);
    const response = answers.length
      ? answers.reduce((total, reply) => total + reply.minutes, 0) / answers.length
      : null;
    const fast = answers.filter((reply) => reply.minutes <= 60).length;

    /* Situação atual */
    const conversations = attentionRows(leads, details, messages, statuses);
    const waiting = conversations.filter((row) => row.waitingSince);
    const resolved = conversations.filter((row) => row.status === "resolved").length;
    const sales = salesFunnel(funnels);
    const salesLeads = sales ? leads.filter((lead) => lead.funnelId === sales.id) : [];
    const stageIndex = (lead: (typeof leads)[number]) =>
      sales?.stages.findIndex((stage) => stage.id === lead.stage) ?? -1;
    const proposals = salesLeads.filter(
      (lead) => stageIndex(lead) >= 2 && stageIndex(lead) < (sales?.stages.length ?? 0) - 1,
    );
    const stale = staleLeads(leads, details, funnels, now);

    return {
      month,
      monthTotal,
      pace,
      projection: pace * month.length,
      previous: previousMonthToDate(leads, now),
      pipeline: pipelineKpi(leads, funnels, now, 7).value,
      days: span.days,
      fresh: fresh.length,
      attended,
      won: won.length,
      wonValue,
      ticket,
      ticketBySource,
      response,
      answers: answers.length,
      fast,
      conversations: conversations.length,
      open: conversations.length - resolved,
      resolved,
      waiting,
      proposals: proposals.length,
      proposalsValue: proposals.reduce((total, lead) => total + lead.budget, 0),
      salesLeads: salesLeads.length,
      stale,
      active: leads.filter((lead) => !isClient(lead, funnels)).length,
      sources,
    };
  }, [now, leads, details, messages, statuses, funnels, loading, error]);

  const funnel = funnelId ? findFunnel(funnelId) : salesFunnel(funnels);
  const stages = funnel ? valueByStage(leads, funnel) : [];

  const exportCsv = () => {
    if (!data || !now) return;
    downloadCsv(`painel-${now.toISOString().slice(0, 7)}.csv`, [
      ["Dia", "Leads novos", "Valor dos orçamentos"],
      ...data.month
        .filter((day) => !day.future)
        .map((day) => [day.date.toLocaleDateString("pt-BR"), day.count, String(day.value)]),
    ]);
  };

  const firstName = user?.name.split(" ")[0];

  return (
    <Root>
      <HeaderActions>
        <Button variant="secondary" icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!data}>
          Exportar
        </Button>
        <Button icon={PlusIcon} href="/leads">
          Novo lead
        </Button>
      </HeaderActions>

      <Greeting>
        {user && <Avatar name={user.name} seed={user.seed} src={user.avatarUrl} size="md" shape="circle" />}
        <div>
          <h2>
            {/* Celular: curto, para caber numa linha ao lado dos botões */}
            <WideOnly>{firstName ? `Que bom te ver, ${firstName}!` : "Que bom te ver!"}</WideOnly>
            <NarrowOnly>{firstName ? `Olá, ${firstName}!` : "Olá!"}</NarrowOnly>
          </h2>
          <p>{now ? `Este é o resumo do ateliê em ${formatMonthName(now)}.` : "Carregando o resumo do ateliê..."}</p>
        </div>
        <MobileHeaderSlot />
      </Greeting>

      {data && data.waiting.length > 0 && (
        <Banner href="/conversas">
          <WarningCircleIcon size={17} weight="fill" aria-hidden />
          <span>
            <strong>{plural(data.waiting.length, "cliente espera", "clientes esperam")}</strong> resposta. A mais antiga
            está esperando desde {formatLongDay(new Date(data.waiting[0].waitingSince!))}.
          </span>
          <ArrowRightIcon size={14} aria-hidden />
        </Banner>
      )}

      {!loading && !error && leads.length === 0 && <p role="status">O ateliê ainda não tem oportunidades cadastradas. Use Novo lead para começar; os indicadores serão calculados com os registros salvos.</p>}

      {error ? <div role="alert"><p>Não foi possível carregar os dados do ateliê.</p><Button variant="secondary" onClick={() => void refresh()}>Tentar novamente</Button></div> : !data || !now ? (
        <DashboardSkeleton />
      ) : (
        <Layout>
          <Column>
            <Hero aria-label="Entrada no funil no mês">
              <HeroTop>
                <div>
                  <Eyebrow>Entrada no funil em {formatMonthName(now)}</Eyebrow>
                  <HeroFigure>{formatMoney(data.monthTotal)}</HeroFigure>
                </div>
                <Delta
                  value={change(data.monthTotal, data.previous.value || null)}
                  versus={`vs 1 a ${formatMonthDay(data.previous.until)}`}
                  empty={`sem base em ${formatMonthName(data.previous.until)}`}
                />
              </HeroTop>
              <Strip>
                <div>
                  <dt>Ritmo atual</dt>
                  <dd>{formatMoney(Math.round(data.pace))}</dd>
                  <small>por dia no mês</small>
                </div>
                <div>
                  <dt>Em negociação</dt>
                  <dd>{formatMoney(data.pipeline)}</dd>
                  <small>em orçamentos abertos</small>
                </div>
                <div>
                  <dt>Projeção do mês</dt>
                  <dd>{formatMoney(Math.round(data.projection))}</dd>
                  <small>se o ritmo continuar</small>
                </div>
                <div>
                  <dt>Dias do mês</dt>
                  <dd>
                    {now.getDate()} de {data.month.length}
                  </dd>
                  <small>
                    {data.month.length - now.getDate() === 0
                      ? "último dia"
                      : `faltam ${plural(data.month.length - now.getDate(), "dia", "dias")}`}
                  </small>
                </div>
              </Strip>
            </Hero>

            <Metrics>
              <MetricCard
                title="Leads novos"
                help="Leads que chegaram neste mês, de qualquer origem."
                icon={UserPlusIcon}
                tone="green"
                value={data.fresh}
                note={`${(data.fresh / data.days).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por dia`}
                ratio={data.fresh ? data.attended / data.fresh : 0}
                ratioLabel={`${data.attended} de ${data.fresh} já em atendimento`}
                footer={data.fresh ? `${data.attended} de ${data.fresh} já em atendimento` : "nenhum lead novo ainda"}
              />
              <MetricCard
                title="Ticket médio"
                help="Orçamento médio dos leads do mês, e os dois canais com ticket mais alto."
                icon={ReceiptIcon}
                tone="blue"
                value={formatMoney(Math.round(data.ticket))}
                note="orçamento médio por lead"
              >
                <MiniRows>
                  {data.ticketBySource.length === 0 ? (
                    <Note>sem leads para calcular</Note>
                  ) : (
                    data.ticketBySource.map((row) => {
                      const max = Math.max(...data.ticketBySource.map((item) => item.average), 1);
                      return (
                        <div key={row.source}>
                          <span>{row.source}</span>
                          <strong>{formatMoneyShort(row.average)}</strong>
                          <Segments
                            ratio={row.average / max}
                            color={theme.tones.blue.fg}
                            label={`${row.source}: ${formatMoney(Math.round(row.average))}`}
                          />
                        </div>
                      );
                    })
                  )}
                </MiniRows>
              </MetricCard>
              <MetricCard
                title="Conversão"
                help="Leads do mês que já viraram cliente (funil Clientes ou etapa final de vendas)."
                icon={PercentIcon}
                tone="rose"
                value={percent(data.fresh ? (data.won / data.fresh) * 100 : 0)}
                note="leads que viraram cliente"
                ratio={data.fresh ? data.won / data.fresh : 0}
                footer={data.fresh ? `${data.won} de ${data.fresh} leads` : "sem leads no mês"}
              />
              <MetricCard
                title="Resposta"
                help="Tempo até a primeira resposta nas mensagens vinculadas ao histórico do CRM. Notas internas não contam. O atendimento real do WhatsApp fica em Conversas."
                icon={TimerIcon}
                tone="lavender"
                value={data.response === null ? "Sem respostas" : formatDuration(data.response)}
                note="média até a primeira resposta"
                ratio={data.answers ? data.fast / data.answers : 0}
                footer={
                  data.answers
                    ? `${Math.round((data.fast / data.answers) * 100)}% respondidas em até 1h`
                    : "nenhuma conversa no mês"
                }
              />
              <MetricCard
                title="Conversas"
                help="Históricos com mensagens externas vinculadas ao CRM que ainda não foram resolvidos. Notas internas não entram nesta contagem. Consulte o atendimento real em Conversas."
                icon={ChatsCircleIcon}
                tone="teal"
                value={data.open}
                unit={`de ${data.conversations}`}
                note={
                  data.waiting.length
                    ? plural(data.waiting.length, "espera resposta", "esperam resposta")
                    : "ninguém esperando"
                }
                ratio={data.conversations ? data.resolved / data.conversations : 0}
                footer={`${data.resolved} de ${data.conversations} resolvidas`}
              />
              <MetricCard
                title="Orçamentos"
                help="Leads de vendas nas etapas de orçamento e negociação, agora."
                icon={FileTextIcon}
                tone="peach"
                value={data.proposals}
                unit={formatMoney(data.proposalsValue)}
                note="aguardando a cliente"
                ratio={data.salesLeads ? data.proposals / data.salesLeads : 0}
                footer={`${data.proposals} de ${plural(data.salesLeads, "lead", "leads")} em vendas`}
              />
              <MetricCard
                title="Fechados"
                help="Valor dos leads que chegaram neste mês e já viraram cliente."
                icon={HandCoinsIcon}
                tone="yellow"
                value={formatMoney(data.wonValue)}
                note={
                  data.won ? plural(data.won, "lead virou cliente", "leads viraram cliente") : "nenhum fechado ainda"
                }
                ratio={data.monthTotal ? data.wonValue / data.monthTotal : 0}
                footer={`${data.monthTotal ? Math.round((data.wonValue / data.monthTotal) * 100) : 0}% do valor que entrou`}
              />
              <MetricCard
                title="Sem contato"
                help="Leads (que ainda não são clientes) sem contato há uma semana ou mais."
                icon={ClockCounterClockwiseIcon}
                tone="neutral"
                value={data.stale.length}
                unit={`de ${data.active}`}
                note="há 7 dias ou mais"
                ratio={data.active ? data.stale.length / data.active : 0}
                footer={data.stale.length ? "retome antes que esfriem" : "nenhum lead esquecido"}
              />
            </Metrics>

            <Bottom>
              <FunnelCard funnel={funnel} funnels={funnels} stages={stages} onFunnelChange={setFunnelId} />
              <SourcesCard rows={data.sources} />
            </Bottom>
          </Column>

          <Column>
            <AttentionCard waiting={data.waiting} stale={data.stale} now={now} />
            <ActivityFeed now={now} />
          </Column>
        </Layout>
      )}
    </Root>
  );
}
