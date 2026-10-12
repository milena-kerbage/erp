"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon, ChartLineUpIcon, ClipboardTextIcon, PackageIcon, UsersThreeIcon, WalletIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { dateLabel, money, operationCatalog, quantity, type OperationRecord, type Resource } from "../catalog";
import { erpRequest, requestError } from "../client";
import { Actions, Card, Empty, FieldGrid, Notice, Page, PageHeader, StatCard, StatGrid, Table, TableCard } from "./ui";

export type ERPReports = {
  counts: Record<Resource, number>;
  finance: { incomePaid: number; expensePaid: number; incomePending: number; expensePending: number; overdueIncome: number; overdueExpense: number; byMonth: { month: string; income: number; expense: number }[] };
  inventory: { low: OperationRecord[]; stockValue: number };
  leads: { total: number; byFunnel: { funnelId: string; name: string; count: number; budget: number }[]; bySource: { source: string; count: number }[] };
};
export function ReportsView({ cashOnly = false }: { cashOnly?: boolean }) {
  const [report, setReport] = useState<ERPReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [period, setPeriod] = useState({ from: "", until: "" });
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams();
      if (period.from) query.set("from", period.from);
      if (period.until) query.set("until", period.until);
      setReport(await erpRequest<ERPReports>(`reports${query.size ? `?${query}` : ""}`, { signal }));
    } catch (caught) { if (!signal?.aborted) setError(requestError(caught)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [period]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <Page>
    <PageHeader title={cashOnly ? "Fluxo de caixa" : "Relatórios"} description={cashOnly ? "Compare recebimentos e pagamentos liquidados com as obrigações pendentes." : "Consulte os totais calculados a partir dos registros salvos no sistema."} actions={<Button icon={ArrowClockwiseIcon} variant="secondary" loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    <Card><form onSubmit={(event) => { event.preventDefault(); setPeriod({ from, until }); }}><FieldGrid><TextField label="Período: de" type="date" required={Boolean(from || until)} value={from} onChange={(event) => setFrom(event.target.value)} /><TextField label="Até" type="date" required={Boolean(from || until)} min={from || undefined} value={until} onChange={(event) => setUntil(event.target.value)} /><Actions><Button type="submit" disabled={loading}>Aplicar período</Button><Button variant="ghost" disabled={loading} onClick={() => { setFrom(""); setUntil(""); setPeriod({ from: "", until: "" }); }}>Todo o período</Button></Actions></FieldGrid></form><Notice>O período aplica-se aos lançamentos financeiros: data da baixa para liquidados e vencimento para pendentes. Estoque, CRM e demais módulos mostram a situação atual. Registros cancelados ou arquivados não compõem os valores ativos. Período aplicado: {period.from ? dateLabel(period.from) : "desde o início"} até {period.until ? dateLabel(period.until) : "a última data disponível"}.</Notice></Card>
    {error && <Notice role="alert">{error}</Notice>}
    {loading && !report && <Empty role="status">Calculando relatórios…</Empty>}
    {report && <>
      <StatGrid><StatCard label="Recebido" value={money(report.finance.incomePaid)} note="Recebimentos com baixa" icon={WalletIcon} /><StatCard label="Pago" value={money(report.finance.expensePaid)} note="Pagamentos com baixa" icon={WalletIcon} /><StatCard label="Saldo realizado" value={money(report.finance.incomePaid - report.finance.expensePaid)} note="Recebido menos pago" icon={ChartLineUpIcon} /><StatCard label="Saldo projetado" value={money(report.finance.incomePaid - report.finance.expensePaid + report.finance.incomePending - report.finance.expensePending)} note="Inclui valores pendentes" icon={ChartLineUpIcon} /></StatGrid>
      <StatGrid><StatCard label="A receber" value={money(report.finance.incomePending)} note={`Vencido: ${money(report.finance.overdueIncome)}`} icon={ClipboardTextIcon} /><StatCard label="A pagar" value={money(report.finance.expensePending)} note={`Vencido: ${money(report.finance.overdueExpense)}`} icon={ClipboardTextIcon} /></StatGrid>
      <Card><h3>Movimento realizado por mês</h3>{report.finance.byMonth.length ? <TableCard><Table><thead><tr><th>Mês</th><th>Recebimentos</th><th>Pagamentos</th><th>Saldo</th></tr></thead><tbody>{report.finance.byMonth.map((month) => <tr key={month.month}><td>{month.month}</td><td>{money(month.income)}</td><td>{money(month.expense)}</td><td>{money(month.income - month.expense)}</td></tr>)}</tbody></Table></TableCard> : <Empty>Não há baixas financeiras neste período.</Empty>}<Actions><Button href="/financeiro/receber" variant="secondary">Contas a receber</Button><Button href="/financeiro/pagar" variant="secondary">Contas a pagar</Button></Actions></Card>
      {!cashOnly && <>
        <StatGrid><StatCard label="Clientes e leads" value={String(report.leads.total)} note="Cadastros ativos" icon={UsersThreeIcon} /><StatCard label="Pedidos" value={String(report.counts.pedidos || 0)} note="Pedidos ativos" icon={ClipboardTextIcon} /><StatCard label="Valor de estoque" value={money(report.inventory.stockValue)} note="Saldo × custo unitário cadastrado" icon={PackageIcon} /><StatCard label="Materiais para repor" value={String(report.inventory.low.length)} note="Saldo no mínimo ou abaixo" icon={PackageIcon} /></StatGrid>
        <Card><h3>Volume por módulo</h3><TableCard><Table><thead><tr><th>Módulo</th><th>Registros ativos</th></tr></thead><tbody>{Object.entries(operationCatalog).map(([key, definition]) => <tr key={key}><td>{definition.title}</td><td>{report.counts[key as Resource] || 0}</td></tr>)}</tbody></Table></TableCard></Card>
        <Card><h3>Leads por funil</h3>{report.leads.byFunnel.length ? <TableCard><Table><thead><tr><th>Funil</th><th>Leads</th><th>Orçamentos informados nas oportunidades</th></tr></thead><tbody>{report.leads.byFunnel.map((funnel) => <tr key={funnel.funnelId}><td>{funnel.name}</td><td>{funnel.count}</td><td>{money(funnel.budget)}</td></tr>)}</tbody></Table></TableCard> : <Empty>Ainda não há leads cadastrados.</Empty>}</Card>
        <Card><h3>Origens dos leads</h3>{report.leads.bySource.length ? <TableCard><Table><thead><tr><th>Origem</th><th>Leads</th></tr></thead><tbody>{report.leads.bySource.map((source) => <tr key={source.source}><td>{source.source || "Não informada"}</td><td>{source.count}</td></tr>)}</tbody></Table></TableCard> : <Empty>Ainda não há origens cadastradas.</Empty>}</Card>
        <Card><h3>Materiais que precisam de reposição</h3>{report.inventory.low.length ? <TableCard><Table><thead><tr><th>Material</th><th>Saldo</th><th>Mínimo</th></tr></thead><tbody>{report.inventory.low.map((material) => <tr key={material.id}><td>{String(material.name)}</td><td>{quantity(material.quantity)} {String(material.unit)}</td><td>{quantity(material.minQuantity)} {String(material.unit)}</td></tr>)}</tbody></Table></TableCard> : <Empty>Nenhum material está abaixo do mínimo cadastrado.</Empty>}<Button href="/estoque/materiais" variant="secondary">Abrir estoque</Button></Card>
      </>}
    </>}
    <Notice>Os números representam os registros do ERP. Confira as baixas com os comprovantes do ateliê antes de usar os totais para conciliação bancária.</Notice>
  </Page>;
}
