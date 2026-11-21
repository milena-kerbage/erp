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
import { BirthsCard, ChannelsCard, RevenueCard } from "./ExtraCards";
import { MonthBars, Sparkline } from "./charts";
import { SourcesCard } from "./SourcesCard";
import { Card, CardLink, Delta, Eyebrow, Figure, Help, IconBadge, Note, Segments } from "./ui";
import { conversasHref, leadsHref } from "../links";

/* ---------- Estilos ---------- */

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
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
  grid-template-columns: minmax(0, 1fr) clamp(17.5rem, 22vw, 21rem);
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: stretch;

  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Column = styled.div`
  ${staggerChildren(8, 60)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  min-height: 0;
`;

/* Cartão principal */

const Hero = styled(CardLink)`
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
  font-size: clamp(1.625rem, 6vw, 2.125rem);
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
  gap: ${({ theme }) => theme.spacing(2)};

  @media (max-width: 1320px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const MetricRoot = styled(CardLink)`
  gap: ${({ theme }) => theme.spacing(1.5)};
  height: 7rem;
  padding: ${({ theme }) => theme.spacing(3.5, 4, 0)};
  overflow: hidden;
`;

const MetricTitle = styled.span`
  overflow: hidden;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** Gráfico do indicador: encosta nas duas bordas e no pé do cartão (100% da largura). */
const MetricChart = styled.div`
  margin: auto -${({ theme }) => theme.spacing(4)} 0;
`;

/** Barra de progresso do indicador, no pé do cartão. */
const MetricBar = styled.div`
  margin-top: auto;
  padding-bottom: ${({ theme }) => theme.spacing(3.5)};
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
  flex: 1;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(2)};

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

/** Cartão principal numa faixa só: o valor do mês à esquerda e os quatro números de apoio à direita. */
const HeroLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3, 8)};
  padding: ${({ theme }) => theme.spacing(4, 5)};

  .principal { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; }
  .principal > span { display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.spacing(1, 3)}; }

  dl { display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(2, 0)}; margin: 0; }
  dl > div { display: flex; flex-direction: column; gap: 2px; padding: 0 ${({ theme }) => theme.spacing(5)}; }
  dl > div + div { border-left: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  dl > div:last-of-type { padding-right: 0; }
  dt { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
  dd { margin: 0; font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; }

  @media (max-width: 760px) {
    dl { width: 100%; }
    dl > div { flex: 1 1 40%; padding: 0 ${({ theme }) => theme.spacing(3)}; }
    dl > div:nth-of-type(odd) { padding-left: 0; border-left: 0; }
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
  font-size: clamp(1.25rem, 10cqi, 1.625rem);
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1.1;
  white-space: nowrap;
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

/**
 * Indicador objetivo, sempre da mesma altura: o nome, o número (com o crescimento ao lado, quando compara) e UMA
 * leitura visual embaixo: a linha de tendência, de ponta a ponta do cartão, ou a barra de progresso.
 */
function MetricCard({
  title,
  href,
  tone,
  value,
  unit,
  ratio,
  delta,
  deltaVersus,
  upIsGood,
  series,
}: {
  title: string;
  /** Para onde o cartão leva: a lista com o recorte deste número. */
  href: string;
  tone: Tone;
  value: ReactNode;
  unit?: string;
  ratio?: number;
  /** Variação contra o mesmo trecho do mês passado (undefined = este indicador não compara). */
  delta?: number | null;
  deltaVersus?: string;
  upIsGood?: boolean;
  /** Um ponto por dia do mês: vira a linha de tendência no lugar da barra. */
  series?: (number | null)[];
}) {
  const theme = useTheme();
  return (
    <MetricRoot href={href} aria-label={`${title}: abrir a lista`}>
      <MetricTitle>{title}</MetricTitle>
      <FigureRow>
        <BigFigure>
          {value}
          {unit && <small>{unit}</small>}
        </BigFigure>
        {/* Crescimento ao lado do número (o período comparado fica na dica) */}
        {delta !== undefined && delta !== null && <span title={deltaVersus}><Delta value={delta} upIsGood={upIsGood} /></span>}
      </FigureRow>
      {series ? (
        <MetricChart>
          <Sparkline values={series} color={theme.tones[tone].fg} label={`${title} por dia no mês`} height={34} />
        </MetricChart>
      ) : (
        <MetricBar>
          <Segments ratio={ratio ?? 0} color={theme.tones[tone].fg} label={`${Math.round((ratio ?? 0) * 100)}%`} />
        </MetricBar>
      )}
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
        {card("3rem", "hero")}
        <Metrics>{Array.from({ length: 8 }, (_, index) => card("3.5rem", `m${index}`))}</Metrics>
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
  // Destinos dos cartões: os leads que entraram nos últimos 30 dias e os que estão em orçamento ou negociação
  // (da terceira etapa do funil de vendas até a penúltima), como no número de "Orçamentos abertos".
  const recentes = leadsHref({ criados: 30 });
  const vendas = salesFunnel(funnels);
  const emOrcamento = vendas ? vendas.stages.slice(2, -1).map((stage) => `${vendas.id}:${stage.id}`) : [];
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
            <Hero href={recentes} aria-label="Entrada no funil no mês: abrir os leads dos últimos 30 dias">
              <HeroLinha>
                <div className="principal">
                  <Eyebrow>Entrada no funil em {formatMonthName(now)}</Eyebrow>
                  <span>
                    <HeroFigure>{formatMoney(data.monthTotal)}</HeroFigure>
                    <Delta
                      value={change(data.monthTotal, data.previous.value || null)}
                      versus={`vs 1 a ${formatMonthDay(data.previous.until)}`}
                      empty={`sem base em ${formatMonthName(data.previous.until)}`}
                    />
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Ritmo por dia</dt>
                    <dd>{formatMoney(Math.round(data.pace))}</dd>
                  </div>
                  <div>
                    <dt>Em negociação</dt>
                    <dd>{formatMoney(data.pipeline)}</dd>
                  </div>
                  <div>
                    <dt>Projeção do mês</dt>
                    <dd>{formatMoney(Math.round(data.projection))}</dd>
                  </div>
                  <div>
                    <dt>Dia do mês</dt>
                    <dd>
                      {now.getDate()} de {data.month.length}
                    </dd>
                  </div>
                </dl>
              </HeroLinha>
            </Hero>

            <Metrics>
              <MetricCard title="Leads novos" href={recentes} tone="green" value={data.fresh} delta={change(data.fresh, data.previous.count || null)} deltaVersus={versus}
                series={data.month.map((day) => (day.future ? null : day.count))} />
              <MetricCard title="Ticket médio" href={recentes} tone="blue" value={formatMoney(Math.round(data.ticket))} delta={change(data.ticket, data.previous.count ? data.previous.value / data.previous.count : null)} deltaVersus={versus}
                series={data.month.map((day) => (day.future ? null : day.count ? day.value / day.count : 0))} />
              <MetricCard title="Conversão" href={leadsHref({ categoria: "cliente", criados: 30 })} tone="rose" value={percent(data.fresh ? (data.won / data.fresh) * 100 : 0)} unit={`${data.won} de ${data.fresh}`}
                delta={change(data.fresh ? data.won / data.fresh : 0, data.previous.count ? data.previousWon / data.previous.count : null)} deltaVersus={versus} ratio={data.fresh ? data.won / data.fresh : 0} />
              <MetricCard title="Fechados" href={leadsHref({ categoria: "cliente", criados: 30 })} tone="yellow" value={formatMoney(data.wonValue)} delta={change(data.wonValue, data.previousWonValue || null)} deltaVersus={versus}
                ratio={data.monthTotal ? data.wonValue / data.monthTotal : 0} />
              <MetricCard title="Orçamentos abertos" href={leadsHref({ etapas: emOrcamento })} tone="peach" value={data.proposals} unit={formatMoney(data.proposalsValue)} ratio={data.salesLeads ? data.proposals / data.salesLeads : 0} />
              <MetricCard title="Esperando resposta" href={conversasHref("aguardando")} tone="teal" value={data.atendimento?.aguardando ?? 0} unit={`${data.atendimento?.naoLidas ?? 0} não lidas`}
                ratio={data.atendimento && data.atendimento.aguardando + data.atendimento.naoLidas > 0 ? data.atendimento.aguardando / Math.max(data.atendimento.aguardando, data.atendimento.naoLidas) : 0} />
              <MetricCard title="Bebês em 30 dias" href={leadsHref({ nascimento: 30 })} tone="lavender" value={data.births.d30} unit={`${data.births.d90} em 90 dias`} ratio={data.births.d90 ? data.births.d30 / data.births.d90 : 0} />
              <MetricCard title="Sem contato há 7 dias" href={leadsHref({ parados: true })} tone="neutral" value={data.staleCount} unit={`de ${data.active}`} ratio={data.active ? data.staleCount / data.active : 0} />
            </Metrics>

            <Bottom>
              <FunnelCard funnel={funnel} funnels={funnels} stages={stages} onFunnelChange={setFunnelId} />
              <SourcesCard rows={data.sources} />
            </Bottom>
          </Column>

          {/* Coluna lateral, discreta: o prazo dos enxovais, o faturamento mês a mês e quanto cada canal converte */}
          <Column>
            <BirthsCard births={data.births} />
            <RevenueCard rows={data.revenue} />
            <ChannelsCard rows={data.sources} />
          </Column>
        </Layout>
      )}
    </Root>
  );
}
