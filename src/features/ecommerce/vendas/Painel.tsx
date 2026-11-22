"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import { ArrowRightIcon, ClipboardTextIcon, PlusIcon, ShoppingBagIcon, StorefrontIcon, TicketIcon } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HeaderActions, MobileHeaderSlot } from "@/components/layout/Header/HeaderActions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { MetricCard } from "@/features/dashboard/components/MetricCard";
import { Card, CardHead, EmptyNote, Progress, Segmented, SegmentedItem } from "@/features/dashboard/components/ui";
import type { PainelLoja, PeriodoPainel } from "@/features/ecommerce/types";
import { STATUS_PEDIDO } from "@/loja/lib/contas/regras";
import { staggerChildren } from "@/styles/animations";
import type { Tone } from "@/styles/theme";
import { AvisoRestrito, data, dinheiro, dinheiroCurto, ETAPA_CURTA, ETAPAS, plural, TOM_ETAPA, useDadosErp, useRestrito } from "./comum";

const PERIODOS: { value: PeriodoPainel; label: string; dias: number }[] = [
  { value: "7d", label: "7 dias", dias: 7 },
  { value: "30d", label: "30 dias", dias: 30 },
  { value: "90d", label: "90 dias", dias: 90 },
];
const porcentagem = (valor: number) => `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
/** "2026-11-08" → "08/11" (rótulo do eixo). */
const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/**
 * Visão geral do e-commerce: pedidos e valor "a partir de" do período, ticket médio, novas contas,
 * carrinhos abandonados, conversão carrinho → pedido, a série diária, as etapas e os rankings.
 * O valor final de cada pedido é combinado pelo WhatsApp (5% OFF no Pix, frete a consultar).
 */
export function PainelEcommerce() {
  const [periodo, setPeriodo] = useState<PeriodoPainel>("30d");
  const { dados, carregando, erro, negado, recarregar } = useDadosErp<PainelLoja>(`loja/painel?periodo=${periodo}`);
  const restrito = useRestrito(negado);
  const atual = dados?.periodo === periodo ? dados : null;
  const vazio = Boolean(atual && !atual.pedidos && !atual.porEtapa.cancelado && !atual.novasContas && !atual.carrinhosAbandonados.quantidade);

  return <Root>
    <HeaderActions>
      <Button variant="secondary" icon={TicketIcon} href="/ecommerce/cupons?novo=1">Novo cupom</Button>
      <Button icon={PlusIcon} href="/ecommerce/produtos?novo=1">Novo produto</Button>
    </HeaderActions>
    <Topo>
      <div>
        <h2>Loja online</h2>
        <p>{atual ? `De ${data(atual.desde)} a ${data(atual.ate)}. Valores “a partir de”: o final é combinado no WhatsApp.` : "Pedidos, contas e sacolas da loja."}</p>
      </div>
      <Segmented role="group" aria-label="Período do painel">
        {PERIODOS.map((item) => <SegmentedItem key={item.value} type="button" $active={periodo === item.value} aria-pressed={periodo === item.value} onClick={() => setPeriodo(item.value)}>{item.label}</SegmentedItem>)}
      </Segmented>
      <MobileHeaderSlot />
    </Topo>

    {restrito ? <AvisoRestrito area="O painel do e-commerce" /> : erro ? <div role="alert"><p>{erro}</p><Button variant="secondary" onClick={() => void recarregar()}>Tentar novamente</Button></div> : !atual ? <Esqueleto carregando={carregando} /> : vazio ? <Vazio periodo={PERIODOS.find((item) => item.value === periodo)!.dias} /> : <>
      <Quadro>
      <Indicadores dados={atual} />
      <Grade>
        <SerieDiaria dados={atual} />
        <Coluna>
          <PorEtapa dados={atual} />
          <Atalhos dados={atual} />
        </Coluna>
      </Grade>
      <Rankings>
        <Ranking titulo="Produtos mais pedidos" tom="teal" href="/ecommerce/produtos" vazio="Nenhuma peça pedida no período."
          linhas={atual.produtosMaisPedidos.slice(0, 6).map((item) => ({ chave: item.slug || item.nome, rotulo: item.nome, valor: item.quantidade, detalhe: `${plural(item.quantidade, "peça", "peças")} · ${dinheiroCurto(item.valorCentavos)}` }))} />
        <Ranking titulo="Categorias mais pedidas" tom="lavender" href="/ecommerce/categorias" vazio="Sem categorias no período."
          linhas={atual.categoriasMaisPedidas.slice(0, 6).map((item) => ({ chave: item.caminho, rotulo: item.nome, valor: item.quantidade, detalhe: `${plural(item.quantidade, "peça", "peças")} · ${dinheiroCurto(item.valorCentavos)}` }))} />
        <Ranking titulo="Cupons mais usados" tom="peach" vazio="Nenhum cupom usado no período." href="/ecommerce/cupons"
          linhas={atual.cuponsMaisUsados.slice(0, 6).map((item) => ({ chave: item.codigo, rotulo: item.tipo === "boas_vindas" ? `${item.codigo} (1ª compra)` : item.codigo, valor: item.usos, detalhe: `${plural(item.usos, "uso", "usos")} · −${dinheiroCurto(item.descontoCentavos)}` }))} />
      </Rankings>
      </Quadro>
    </>}
  </Root>;
}

/* ---------- Indicadores ---------- */

function Indicadores({ dados }: { dados: PainelLoja }) {
  const pagos = dados.porEtapa.pagamento_confirmado + dados.porEtapa.despachado + dados.porEtapa.entregue;
  const dias = dados.serieDiaria.length || 1;
  const abandonados = dados.carrinhosAbandonados;
  const porDia = (quantidade: number) => `${(quantidade / dias).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por dia`;
  // O mesmo cartão do Painel: título, número e uma leitura. O cartão inteiro leva à lista daquele número.
  return <Metricas>
    <MetricCard title="Pedidos" href="/ecommerce/pedidos" tone="blue" value={dados.pedidos.toLocaleString("pt-BR")} unit={dados.pedidos ? `${pagos} pagos` : porDia(0)}
      ratio={dados.pedidos ? pagos / dados.pedidos : 0} />
    <MetricCard title="Valor “a partir de”" href="/ecommerce/pedidos" tone="green" value={dinheiro(dados.valorCentavos)} series={dados.serieDiaria.map((ponto) => ponto.valorCentavos / 100)} />
    <MetricCard title="Ticket médio" href="/ecommerce/pedidos" tone="teal" value={dinheiro(dados.ticketMedioCentavos)} unit="por pedido"
      series={dados.serieDiaria.map((ponto) => (ponto.pedidos ? ponto.valorCentavos / 100 / ponto.pedidos : 0))} />
    <MetricCard title="Novas contas" href="/ecommerce/clientes" tone="lavender" value={dados.novasContas.toLocaleString("pt-BR")} unit={porDia(dados.novasContas)}
      ratio={dados.novasContas + dados.pedidos ? dados.novasContas / Math.max(dados.novasContas, dados.pedidos) : 0} />
    <MetricCard title="Carrinhos abandonados" href="/ecommerce/carrinhos" tone="peach" value={abandonados.quantidade.toLocaleString("pt-BR")} unit={dinheiroCurto(abandonados.valorCentavos)}
      ratio={abandonados.quantidade + dados.pedidos ? abandonados.quantidade / (abandonados.quantidade + dados.pedidos) : 0} />
    <MetricCard title="Conversão do carrinho" href="/ecommerce/carrinhos" tone="rose" value={dados.conversaoCarrinho === null ? "–" : porcentagem(dados.conversaoCarrinho)} unit="carrinho → pedido"
      ratio={dados.conversaoCarrinho ?? 0} />
  </Metricas>;
}

/* ---------- Série diária ---------- */

type Medida = "pedidos" | "valor";

function SerieDiaria({ dados }: { dados: PainelLoja }) {
  const theme = useTheme();
  const [medida, setMedida] = useState<Medida>("pedidos");
  const pontos = useMemo(() => dados.serieDiaria.map((ponto) => ({ dia: ponto.dia, pedidos: ponto.pedidos, valor: ponto.valorCentavos / 100 })), [dados.serieDiaria]);
  const cor = theme.palette.sage[400];
  const formato = (valor: number) => (medida === "pedidos" ? String(valor) : dinheiroCurto(Math.round(valor * 100)));

  return <Card aria-label="Pedidos por dia">
    <CardHead title={medida === "pedidos" ? "Pedidos por dia" : "Valor “a partir de” por dia"}>
      <Segmented role="group" aria-label="Medida do gráfico">
        <SegmentedItem type="button" $active={medida === "pedidos"} aria-pressed={medida === "pedidos"} onClick={() => setMedida("pedidos")}>Pedidos</SegmentedItem>
        <SegmentedItem type="button" $active={medida === "valor"} aria-pressed={medida === "valor"} onClick={() => setMedida("valor")}>Valor</SegmentedItem>
      </Segmented>
    </CardHead>
    <Grafico aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pontos} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap={pontos.length > 40 ? 1 : "18%"} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke={theme.colors.border.faint} />
          <XAxis dataKey="dia" tickFormatter={diaCurto} tick={{ fontSize: 11, fill: theme.colors.text.muted }} tickLine={false} axisLine={{ stroke: theme.colors.border.subtle }} minTickGap={18} />
          <YAxis allowDecimals={false} tickFormatter={formato} tick={{ fontSize: 11, fill: theme.colors.text.muted }} tickLine={false} axisLine={false} width={medida === "valor" ? 64 : 40} />
          <Tooltip cursor={{ fill: theme.colors.interactive.hover }} content={({ active, payload }) => {
            const ponto = active && payload?.[0]?.payload as (typeof pontos)[number] | undefined;
            if (!ponto) return null;
            return <Dica><strong>{data(`${ponto.dia}T12:00:00-03:00`)}</strong><span>{plural(ponto.pedidos, "pedido", "pedidos")}</span><span>{dinheiro(Math.round(ponto.valor * 100))} “a partir de”</span></Dica>;
          }} />
          <Bar dataKey={medida} fill={cor} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </Grafico>
    <VisuallyHidden as="div">
      <table>
        <caption>Pedidos e valor “a partir de” por dia</caption>
        <thead><tr><th scope="col">Dia</th><th scope="col">Pedidos</th><th scope="col">Valor</th></tr></thead>
        <tbody>{dados.serieDiaria.map((ponto) => <tr key={ponto.dia}><td>{diaCurto(ponto.dia)}</td><td>{ponto.pedidos}</td><td>{dinheiro(ponto.valorCentavos)}</td></tr>)}</tbody>
      </table>
    </VisuallyHidden>
  </Card>;
}

/* ---------- Etapas e atalhos ---------- */

function PorEtapa({ dados }: { dados: PainelLoja }) {
  const total = ETAPAS.reduce((soma, etapa) => soma + dados.porEtapa[etapa], 0);
  return <Card aria-label="Pedidos por etapa">
    <CardHead title="Pedidos por etapa" />
    {!total ? <EmptyNote>Nenhum pedido no período.</EmptyNote> : <Etapas>
      {ETAPAS.map((etapa) => <li key={etapa}>
        <Link href={`/ecommerce/pedidos?etapa=${etapa}`}>
          <span>{STATUS_PEDIDO[etapa]}</span>
          <strong>{dados.porEtapa[etapa]}</strong>
          <Progress ratio={dados.porEtapa[etapa] / total} tone={TOM_ETAPA[etapa]} label={`${ETAPA_CURTA[etapa]}: ${dados.porEtapa[etapa]} de ${total}`} />
        </Link>
      </li>)}
    </Etapas>}
  </Card>;
}

function Atalhos({ dados }: { dados: PainelLoja }) {
  return <Card aria-label="Atalhos">
    <CardHead title="Atalhos" />
    <ListaAtalhos>
      <li><Link href="/ecommerce/produtos?novo=1"><PlusIcon size={16} aria-hidden /><span>Novo produto</span><ArrowRightIcon size={14} aria-hidden /></Link></li>
      <li><Link href="/ecommerce/cupons?novo=1"><TicketIcon size={16} aria-hidden /><span>Novo cupom</span><ArrowRightIcon size={14} aria-hidden /></Link></li>
      <li><Link href="/ecommerce/carrinhos"><ShoppingBagIcon size={16} aria-hidden /><span>Ver carrinhos abandonados{dados.carrinhosAbandonados.quantidade ? ` (${dados.carrinhosAbandonados.quantidade})` : ""}</span><ArrowRightIcon size={14} aria-hidden /></Link></li>
      <li><Link href="/ecommerce/pedidos?etapa=enviado_whatsapp"><ClipboardTextIcon size={16} aria-hidden /><span>Pedidos esperando pagamento{dados.porEtapa.enviado_whatsapp ? ` (${dados.porEtapa.enviado_whatsapp})` : ""}</span><ArrowRightIcon size={14} aria-hidden /></Link></li>
    </ListaAtalhos>
  </Card>;
}

/* ---------- Rankings ---------- */

type LinhaRanking = { chave: string; rotulo: string; valor: number; detalhe: string };

function Ranking({ titulo, tom, linhas, vazio, href }: { titulo: string; tom: Tone; linhas: LinhaRanking[]; vazio: string; href?: string }) {
  const maior = Math.max(1, ...linhas.map((linha) => linha.valor));
  return <Card aria-label={titulo}>
    <CardHead title={titulo}>{href && linhas.length > 0 && <VerTodos href={href}>Ver todos</VerTodos>}</CardHead>
    {!linhas.length ? <EmptyNote>{vazio}</EmptyNote> : <ListaRanking>
      {linhas.map((linha, indice) => <li key={linha.chave}>
        <span>{indice + 1}</span>
        <div><strong>{linha.rotulo}</strong><small>{linha.detalhe}</small><Progress ratio={linha.valor / maior} tone={tom} label={`${linha.rotulo}: ${linha.detalhe}`} /></div>
      </li>)}
    </ListaRanking>}
  </Card>;
}

/* ---------- Estados ---------- */

function Vazio({ periodo }: { periodo: number }) {
  return <Card><EmptyState icon={<StorefrontIcon size={28} />} title={`Nenhuma venda nos últimos ${periodo} dias`}
    description="Quando as clientes criarem conta, montarem a sacola e enviarem pedidos pelo WhatsApp, os números aparecem aqui: pedidos por etapa, produtos e cupons mais usados e os carrinhos parados.">
    <Button icon={PlusIcon} href="/ecommerce/produtos?novo=1">Cadastrar produto</Button>
    <Button variant="secondary" icon={TicketIcon} href="/ecommerce/cupons?novo=1">Criar cupom</Button>
  </EmptyState></Card>;
}

function Esqueleto({ carregando }: { carregando: boolean }) {
  const cartao = (altura: string, chave: string) => <Card key={chave} aria-hidden><Skeleton $width="40%" /><Skeleton $height={altura} $radius="md" /></Card>;
  return <Metricas aria-busy={carregando} aria-label="Carregando o painel">{Array.from({ length: 6 }, (_, indice) => cartao("4.5rem", `m${indice}`))}</Metricas>;
}

/* ---------- Estilos ---------- */

const Root = styled.div`display: flex; flex: 1; flex-direction: column; gap: ${({ theme }) => theme.spacing(4)}; min-width: 0;`;
const Topo = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.spacing(3)};
  > div:first-of-type { flex: 1; min-width: 14rem; }
  h2 { font-size: 1.25rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; letter-spacing: -0.015em; color: ${({ theme }) => theme.colors.text.primary}; }
  p { font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; }
  ${({ theme }) => theme.media.md} { h2 { font-size: 1.0625rem; } p { font-size: 0.75rem; } }
`;
/**
 * A grade contínua do Painel: sem espaço entre os cartões e sem cantos, divididos só pela borda. O contorno é o da
 * grade (levemente arredondado); as linhas da direita e de baixo dos cartões da beirada ficam 1px para fora, cortadas.
 */
const Quadro = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  --card-border-width: 0 1px 1px 0;
  --card-radius: 0;

  > * { margin-right: -1px; }
  > *:last-child { margin-bottom: -1px; }
`;
const VerTodos = styled(Link)`flex-shrink: 0; padding-top: 2px; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; text-decoration: underline; text-underline-offset: 2px; &:hover { color: ${({ theme }) => theme.colors.text.primary}; }`;
const Metricas = styled.div`
  ${staggerChildren(6, 50)};
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0;
  @media (max-width: 1440px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 760px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 420px) { grid-template-columns: minmax(0, 1fr); }
`;
const Grade = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) clamp(18rem, 26vw, 24rem); gap: 0; @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }`;
const Coluna = styled.div`display: flex; flex-direction: column; gap: 0; min-width: 0; > :last-child { flex: 1; }`;
const Grafico = styled.div`height: 15rem; min-width: 0; ${({ theme }) => theme.media.sm} { height: 12rem; }`;
const Dica = styled.div`display: flex; flex-direction: column; gap: 2px; padding: ${({ theme }) => theme.spacing(2, 3)}; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.palette.neutral[0]}; box-shadow: ${({ theme }) => theme.shadows.md}; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; strong { color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }`;
const Etapas = styled.ul`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; list-style: none;
  a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: ${({ theme }) => theme.spacing(1.5, 2)}; padding: ${({ theme }) => theme.spacing(2)}; margin: ${({ theme }) => theme.spacing(0, -2)}; border-radius: ${({ theme }) => theme.radii.md}; transition: background-color ${({ theme }) => theme.transitions.fast}; }
  a:hover { background: ${({ theme }) => theme.colors.interactive.hover}; }
  a > span:first-of-type { font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.secondary}; }
  strong { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  a > span:last-of-type { grid-column: 1 / -1; }
`;
const ListaAtalhos = styled.ul`display: flex; flex-direction: column; list-style: none;
  a { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2.5)}; padding: ${({ theme }) => theme.spacing(2.5, 2)}; margin: ${({ theme }) => theme.spacing(0, -2)}; border-radius: ${({ theme }) => theme.radii.md}; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.primary}; transition: background-color ${({ theme }) => theme.transitions.fast}; }
  a:hover { background: ${({ theme }) => theme.colors.interactive.hover}; }
  a > span { flex: 1; }
  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Rankings = styled.div`${staggerChildren(3, 60)}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }
  ol a { color: ${({ theme }) => theme.colors.text.primary}; text-decoration: underline; text-underline-offset: 2px; }`;
const ListaRanking = styled.ol`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; list-style: none;
  > li { display: flex; gap: ${({ theme }) => theme.spacing(3)}; }
  > li > span { flex-shrink: 0; width: 1.25rem; padding-top: 1px; font-size: 0.75rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.muted}; text-align: right; }
  > li > div { display: flex; flex: 1; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; }
  strong { overflow: hidden; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; text-overflow: ellipsis; }
  small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
