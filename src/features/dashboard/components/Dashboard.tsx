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
  BabyIcon,
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
import {erpRequest,errorMessage} from "@/features/erp/client";
import type {dashboardSummary} from "@/lib/erp/dashboard";
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
import { FunnelCard } from "./FunnelCard";
import { BirthsCard, CampaignsCard, OwnersCard } from "./ExtraCards";
import { MonthBars, Sparkline } from "./charts";
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
  grid-template-columns: minmax(0, 1fr) clamp(17.5rem, 22vw, 21rem);
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: start;

  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Column = styled.div`
  ${staggerChildren(8, 60)};
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

/** Funil (com mais espaço) e origens lado a lado; empilham em tela estreita. */
const Bottom = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(3)};

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

/** Gráfico do mês dentro do cartão principal: uma barra por dia. */
const HeroChart = styled.div`
  padding: ${({ theme }) => theme.spacing(0, 6, 4)};

  > small {
    display: flex;
    justify-content: space-between;
    margin-top: ${({ theme }) => theme.spacing(1.5)};
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const FigureRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(1, 2)};
`;

/** Número principal dos indicadores: grande, com a unidade ao lado. */
const BigFigure = styled.strong`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing(0, 2)};
  min-width: 0;
  font-size: clamp(1.375rem, 11cqi, 1.75rem);
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};

  small {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.muted};
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
  delta,
  deltaVersus,
  upIsGood,
  series,
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
  /** Variação contra o mesmo trecho do mês passado (undefined = este indicador não compara). */
  delta?: number | null;
  deltaVersus?: string;
  upIsGood?: boolean;
  /** Um ponto por dia do mês: vira a linha de tendência no lugar da barra. */
  series?: (number | null)[];
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
      <FigureRow>
        <BigFigure>
          {value}
          {unit && <small>{unit}</small>}
        </BigFigure>
        {/* Crescimento ao lado do número (o período comparado fica na dica) */}
        {delta !== undefined && delta !== null && <span title={deltaVersus}><Delta value={delta} upIsGood={upIsGood} /></span>}
      </FigureRow>
      <MetricBottom>
        <Note>{note}</Note>
        {children ??
          (series ? (
            <Sparkline values={series} color={theme.tones[tone].fg} label={`${title} por dia no mês`} />
          ) : (
            ratio !== undefined && (
              <Segments ratio={ratio} color={theme.tones[tone].fg} label={ratioLabel ?? `${Math.round(ratio * 100)}%`} />
            )
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
        {card("9rem", "hero")}
        <Metrics>{Array.from({ length: 8 }, (_, index) => card("5.5rem", `m${index}`))}</Metrics>
      </Column>
      <Column>
        {card("12rem", "a")}
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
  const [report,setReport]=useState<(Awaited<ReturnType<typeof dashboardSummary>>&{atendimento?:{aguardando:number;naoLidas:number}})|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const refresh=async()=>{setLoading(true);setError("");try{setReport(await erpRequest(`/dashboard?offset=${new Date().getTimezoneOffset()}`));}catch(cause){setError(errorMessage(cause));}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[]);
  const { funnels, findFunnel } = useFunnels();
  const [funnelId, setFunnelId] = useState<string | undefined>(undefined);
  // Datas dependem do fuso de quem vê: calcula só no navegador
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const data=useMemo(()=>report?{...report,month:report.month.map(day=>({...day,date:new Date(day.date)})),previous:{...report.previous,until:new Date(report.previous.until)}}:null,[report]);
  const funnel=funnelId?findFunnel(funnelId):salesFunnel(funnels);
  const stages=funnel?data?.stages[funnel.id]??[]:[];

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
  // Todos os crescimentos comparam com o mesmo trecho do mês passado (do dia 1 até o dia de hoje).
  const versus = data ? `vs 1 a ${formatMonthDay(data.previous.until)}` : undefined;

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


      {!loading && !error && data?.total === 0 && <p role="status">O ateliê ainda não tem oportunidades cadastradas. Use Novo lead para começar; os indicadores serão calculados com os registros salvos.</p>}

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
              <HeroChart>
                <MonthBars days={data.month} color={theme.colors.primary.main} format={formatMoney} label={`Valor que entrou por dia em ${formatMonthName(now)}`} />
                <small>
                  <span>dia 1</span>
                  <span>{plural(data.fresh, "lead", "leads")} no mês · melhor dia {formatMoney(Math.max(...data.month.map((day) => day.value)))}</span>
                  <span>dia {data.month.length}</span>
                </small>
              </HeroChart>
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
                delta={change(data.fresh, data.previous.count || null)}
                deltaVersus={versus}
                note={`${(data.fresh / data.days).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por dia`}
                series={data.month.map((day) => (day.future ? null : day.count))}
                footer={data.fresh ? `${data.attended} de ${data.fresh} já em atendimento` : "nenhum lead novo ainda"}
              />
              <MetricCard
                title="Ticket médio"
                help="Orçamento médio dos leads do mês, e os dois canais com ticket mais alto."
                icon={ReceiptIcon}
                tone="blue"
                value={formatMoney(Math.round(data.ticket))}
                delta={change(data.ticket, data.previous.count ? data.previous.value / data.previous.count : null)}
                deltaVersus={versus}
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
                delta={change(data.fresh ? data.won / data.fresh : 0, data.previous.count ? data.previousWon / data.previous.count : null)}
                deltaVersus={versus}
                note="leads que viraram cliente"
                ratio={data.fresh ? data.won / data.fresh : 0}
                footer={data.fresh ? `${data.won} de ${data.fresh} leads` : "sem leads no mês"}
              />
              <MetricCard
                title="Bebês chegando"
                help="Fichas com nascimento previsto para os próximos 30 dias: é o prazo de verdade de cada enxoval."
                icon={BabyIcon}
                tone="rose"
                value={data.births.d30}
                unit="nos próximos 30 dias"
                note={`${data.births.d60} em 60 dias · ${data.births.d90} em 90 dias`}
                ratio={data.births.d90 ? data.births.d30 / data.births.d90 : 0}
                ratioLabel={`${data.births.d30} de ${data.births.d90} nascem em até 30 dias`}
                footer={data.births.d30 ? "confira se o enxoval está em produção" : "nenhum prazo apertado agora"}
              />
              <MetricCard
                title="Atendimento"
                help="Conversas do WhatsApp esperando resposta da equipe agora (a última mensagem é da cliente) e as que têm mensagem não lida."
                icon={ChatsCircleIcon}
                tone="teal"
                value={data.atendimento?.aguardando ?? 0}
                unit="esperando resposta"
                note={plural(data.atendimento?.naoLidas ?? 0, "conversa com mensagem não lida", "conversas com mensagem não lida")}
                ratio={data.atendimento && data.atendimento.aguardando + data.atendimento.naoLidas > 0 ? data.atendimento.aguardando / Math.max(data.atendimento.aguardando, data.atendimento.naoLidas) : 0}
                footer={<Link href="/conversas">Abrir o WhatsApp</Link>}
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
                delta={change(data.wonValue, data.previousWonValue || null)}
                deltaVersus={versus}
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
                value={data.staleCount}
                unit={`de ${data.active}`}
                note="há 7 dias ou mais"
                ratio={data.active ? data.staleCount / data.active : 0}
                footer={data.stale.length ? "retome antes que esfriem" : "nenhum lead esquecido"}
              />
            </Metrics>

            <Bottom>
              <FunnelCard funnel={funnel} funnels={funnels} stages={stages} onFunnelChange={setFunnelId} />
              <SourcesCard rows={data.sources} />
            </Bottom>
          </Column>

          {/* Coluna lateral, discreta: o prazo dos enxovais, a equipe e o que as campanhas trouxeram */}
          <Column>
            <BirthsCard births={data.births} />
            <OwnersCard rows={data.owners} />
            <CampaignsCard rows={data.campaigns} tracked={data.tracked} total={data.fresh} />
          </Column>
        </Layout>
      )}
    </Root>
  );
}
