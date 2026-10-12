"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveIcon, ArrowClockwiseIcon, ArrowCounterClockwiseIcon, CalendarBlankIcon, CheckIcon, ClipboardTextIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { operationCatalog, dateLabel, money, quantity, type OperationRecord, type Resource } from "../catalog";
import { ErpRequestError, erpRequest, requestError } from "../client";
import { RecordEditor, type RelationOptions } from "./RecordEditor";
import { Actions, Card, Empty, Label, ListItem, NativeSelect, Notice, Page, PageHeader, Pill, Stack, StatCard, StatGrid, Table, TableCard, Toolbar } from "./ui";

const emptyRelations: RelationOptions = { leads: [], pedidos: [], orcamentos: [], materiais: [] };
const currentDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const recordName = (record: OperationRecord) => String(record.title || record.name || record.id);
export function OperationsView({ resource, section }: { resource: Resource; section?: "active" | "finished" | "income" | "expense" }) {
  const definition = operationCatalog[resource];
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [relations, setRelations] = useState<RelationOptions>(emptyRelations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dependencyError, setDependencyError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<OperationRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiving, setArchiving] = useState<OperationRecord | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState<Record<string, string | number | boolean> | undefined>();
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(""); setAccessDenied(false);
    try {
      const result = await erpRequest<{ records: OperationRecord[]; pagination?: { total: number; offset: number; limit: number; hasMore: boolean } }>(`records/${resource}?archived=all&limit=500`, { signal });
      setRecords(result.records); setTotalAvailable(result.pagination?.total ?? result.records.length); setHasMore(Boolean(result.pagination?.hasMore));
    } catch (caught) { if (!signal?.aborted) { setError(requestError(caught)); setAccessDenied(caught instanceof ErpRequestError && [401, 403].includes(caught.status)); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [resource]);
  const loadRelations = useCallback(async (signal?: AbortSignal) => {
    const needed = new Set(definition.fields.map((field) => field.relation).filter(Boolean));
    if (resource === "orcamentos") { needed.add("pedidos"); needed.add("orcamentos"); }
    const keys = [...needed] as (keyof RelationOptions)[];
    const results = await Promise.allSettled(keys.map(async (key) => {
      if (key === "leads") {
        const result = await erpRequest<{ leads: { id: string; name: string; phone?: string }[] }>("leads", { signal });
        return [key, result.leads.map((lead) => ({ id: lead.id, label: `${lead.name}${lead.phone ? ` · ${lead.phone}` : ""}` }))] as const;
      }
      const result = await erpRequest<{ records: OperationRecord[] }>(`records/${key}`, { signal });
      return [key, result.records.map((record) => ({ id: record.id, label: recordName(record), record }))] as const;
    }));
    if (signal?.aborted) return;
    const next = { ...emptyRelations };
    const failures: string[] = [];
    results.forEach((result, index) => { if (result.status === "fulfilled") next[result.value[0]] = result.value[1]; else failures.push(`${keys[index]}: ${requestError(result.reason)}`); });
    setRelations(next); setDependencyError(failures.length ? `Não foi possível carregar os vínculos necessários. Recarregue antes de salvar. ${failures.join(" · ")}` : "");
  }, [definition, resource]);
  const reload = useCallback(async () => { await Promise.all([load(), loadRelations()]); }, [load, loadRelations]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal); void loadRelations(controller.signal);
    const changed = () => { void loadRelations(controller.signal); };
    window.addEventListener("erp:changed", changed);
    return () => { controller.abort(); window.removeEventListener("erp:changed", changed); };
  }, [load, loadRelations]);
  const statusField = definition.fields.find((field) => field.key === "status");
  const dateKey = resource === "agenda" ? "startAt" : resource === "movimentacoes" ? "date" : resource === "orcamentos" ? "validUntil" : "dueDate";
  const visible = useMemo(() => records.filter((record) => {
    if (archiveFilter === "active" && record.archivedAt || archiveFilter === "archived" && !record.archivedAt) return false;
    if (section === "active" && ["delivered", "cancelled"].includes(String(record.status)) || section === "finished" && !["delivered", "cancelled"].includes(String(record.status))) return false;
    if (section === "income" && record.type !== "income" || section === "expense" && record.type !== "expense") return false;
    if (status && record.status !== status && record.direction !== status) return false;
    if (onlyLow && Number(record.quantity) > Number(record.minQuantity)) return false;
    const rawDate = record[dateKey];
    const date = typeof rawDate === "string" ? resource === "agenda" ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(rawDate)) : rawDate.slice(0, 10) : "";
    if (from && (!date || date < from) || until && (!date || date > until)) return false;
    const searchable = [...Object.values(record).filter((value) => typeof value === "string"), ...definition.fields.filter((field) => field.relation).map((field) => relations[field.relation!].find((related) => related.id === record[field.key])?.label || "")].join(" ").toLocaleLowerCase("pt-BR");
    return searchable.includes(search.toLocaleLowerCase("pt-BR"));
  }).sort((left, right) => resource === "agenda" ? String(left.startAt).localeCompare(String(right.startAt)) : String(right.createdAt).localeCompare(String(left.createdAt))), [records, archiveFilter, section, status, onlyLow, dateKey, from, until, definition, relations, resource, search]);
  function cell(record: OperationRecord, column: typeof definition.columns[number]) {
    const value = record[column.key];
    if (column.format === "relation") { const relation = definition.fields.find((field) => field.key === column.key)?.relation; return relation ? relations[relation].find((item) => item.id === value)?.label || (value ? "Registro relacionado indisponível" : "—") : "—"; }
    if (column.format === "money") return money(value);
    if (column.format === "quantity") return quantity(value);
    if (column.format === "date" || column.format === "datetime") return dateLabel(value, column.format === "datetime");
    if (column.format === "boolean") return value ? "Sim" : "Não";
    const field = definition.fields.find((item) => item.key === column.key);
    return field?.options?.find((option) => option.value === value)?.label || String(value || "—");
  }
  async function archive(record: OperationRecord, restore = false) {
    setPendingAction(true); setError("");
    try {
      await erpRequest(`records/${resource}/${encodeURIComponent(record.id)}${restore ? "" : `?revision=${record.revision}`}`, { method: restore ? "PATCH" : "DELETE", body: restore ? { revision: record.revision, restore: true } : undefined });
      setNotice(restore ? "Registro restaurado." : "Registro arquivado. Você pode restaurá-lo pelo filtro Arquivados."); setArchiving(null); await reload();
    } catch (caught) { setError(requestError(caught)); }
    finally { setPendingAction(false); }
  }
  async function settle(record: OperationRecord) {
    setPendingAction(true); setError("");
    try { await erpRequest(`records/financeiro/${encodeURIComponent(record.id)}`, { method: "PATCH", body: { revision: record.revision, record: { status: "paid", paidAt: currentDay() } } }); setNotice("Baixa registrada com a data de hoje."); await reload(); }
    catch (caught) { setError(requestError(caught)); } finally { setPendingAction(false); }
  }
  async function loadMore() {
    setLoading(true);
    try {
      const result = await erpRequest<{ records: OperationRecord[]; pagination?: { total: number; hasMore: boolean } }>(`records/${resource}?archived=all&limit=500&offset=${records.length}`);
      setRecords((current) => [...current, ...result.records.filter((record) => !current.some((existing) => existing.id === record.id))]); setHasMore(Boolean(result.pagination?.hasMore));
    } catch (caught) { setError(requestError(caught)); } finally { setLoading(false); }
  }
  function rowActions(record: OperationRecord) {
    return <Actions>{record.archivedAt ? <Button size="sm" variant="secondary" icon={ArrowCounterClockwiseIcon} disabled={pendingAction} onClick={() => void archive(record, true)}>Restaurar</Button> : <>
      {resource !== "movimentacoes" && <Button size="sm" variant="ghost" icon={PencilSimpleIcon} onClick={() => { setEditing(record); setEditorOpen(true); }}>Editar</Button>}
      {resource === "orcamentos" && record.status === "accepted" && <Button size="sm" variant="secondary" icon={ClipboardTextIcon} onClick={() => setCreatingOrder({ title: String(record.title), leadId: String(record.leadId), orcamentoId: record.id, total: Number(record.total), dueDate: String(record.validUntil || currentDay()), status: "confirmed" })}>Criar pedido</Button>}
      {resource === "financeiro" && record.status === "pending" && <Button size="sm" variant="secondary" icon={CheckIcon} disabled={pendingAction} onClick={() => void settle(record)}>Registrar baixa</Button>}
      <Button size="sm" variant="ghost" icon={ArchiveIcon} disabled={pendingAction} onClick={() => { setError(""); setArchiving(record); }}>Arquivar</Button>
    </>}</Actions>;
  }
  const financeRecords = visible.filter((record) => !record.archivedAt && record.status !== "cancelled");
  const title = section === "active" ? "Pedidos em andamento" : section === "finished" ? "Pedidos finalizados" : section === "income" ? "Contas a receber" : section === "expense" ? "Contas a pagar" : definition.title;
  return <Page>
    <PageHeader title={title} description={definition.description} actions={<Actions><Button variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void reload()}>Atualizar</Button><Button icon={PlusIcon} disabled={loading || accessDenied} onClick={() => { setEditing(null); setEditorOpen(true); }}>{["producao", "movimentacoes"].includes(resource) ? "Nova" : "Novo"} {definition.singular}</Button></Actions>} />
    {error && <Notice role="alert">{error} <Button variant="ghost" size="sm" onClick={() => void reload()}>Tentar novamente</Button></Notice>}
    {notice && <Notice role="status">{notice}</Notice>}
    {resource === "financeiro" && <StatGrid><StatCard label="Pendente no filtro" value={money(financeRecords.filter((record) => record.status === "pending").reduce((sum, record) => sum + Number(record.amount || 0), 0))} note="Valores dos registros exibidos" icon={ClipboardTextIcon} /><StatCard label="Liquidado no filtro" value={money(financeRecords.filter((record) => record.status === "paid").reduce((sum, record) => sum + Number(record.amount || 0), 0))} note="Baixas registradas pelo ateliê" icon={CheckIcon} /><StatCard label="Vencido no filtro" value={money(financeRecords.filter((record) => record.status === "pending" && String(record.dueDate) < currentDay()).reduce((sum, record) => sum + Number(record.amount || 0), 0))} note="Pendente com vencimento anterior a hoje" icon={CalendarBlankIcon} /></StatGrid>}
    <Card><Toolbar><TextField label="Buscar registros" type="search" placeholder="Descrição, cliente, referência…" value={search} onChange={(event) => setSearch(event.target.value)} /><Label>Visualização<NativeSelect value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></NativeSelect></Label>{(statusField || resource === "movimentacoes") && <Label>{resource === "movimentacoes" ? "Tipo" : "Situação"}<NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas</option>{(statusField?.options || operationCatalog.movimentacoes.fields.find((field) => field.key === "direction")?.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></Label>}</Toolbar>
    {["agenda", "orcamentos", "pedidos", "producao", "movimentacoes", "financeiro"].includes(resource) && <Toolbar><TextField label={`${resource === "agenda" ? "Início" : resource === "orcamentos" ? "Validade" : resource === "movimentacoes" ? "Movimentação" : "Prazo / vencimento"}: de`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><TextField label="Até" type="date" value={until} min={from || undefined} onChange={(event) => setUntil(event.target.value)} /><Button variant="ghost" onClick={() => { setFrom(""); setUntil(""); setSearch(""); setStatus(""); }}>Limpar filtros</Button></Toolbar>}
    {resource === "materiais" && <Actions><label><input type="checkbox" checked={onlyLow} onChange={(event) => setOnlyLow(event.target.checked)} /> Apenas materiais no mínimo ou abaixo</label><Button href="/estoque/movimentacoes" variant="secondary">Registrar entrada ou saída</Button></Actions>}
    <small>{visible.length} registro(s) exibido(s) · {records.length} carregado(s){totalAvailable > records.length ? ` de ${totalAvailable}` : ""}. Alterações persistidas no servidor.</small></Card>
    {loading && !records.length ? <Empty role="status">Carregando registros…</Empty> : !visible.length ? <Card><Empty><strong>{error ? "A lista não pôde ser carregada." : "Nenhum registro encontrado."}</strong><span>{search || status || from || until || onlyLow ? "Ajuste os filtros para procurar outros registros." : `Use Novo ${definition.singular} para cadastrar o primeiro.`}</span></Empty></Card> : resource === "agenda" ? <TableCard>{visible.map((record) => <ListItem key={record.id}><div><h3>{recordName(record)} {record.archivedAt && <Pill $tone="neutral">Arquivado</Pill>}</h3><p>{dateLabel(record.startAt, true)} → {dateLabel(record.endAt, true)} · {cell(record, { key: "leadId", label: "Cliente", format: "relation" })}</p><p>{String(record.location || "Local não informado")} · {cell(record, { key: "status", label: "Situação" })}</p></div>{rowActions(record)}</ListItem>)}</TableCard> : <TableCard><Table><thead><tr>{definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Estado</th><th>Ações</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}>{definition.columns.map((column) => <td key={column.key} style={column.key === "notes" ? { whiteSpace: "normal", maxWidth: "20rem", minWidth: "12rem" } : undefined}>{cell(record, column)}</td>)}<td>{record.archivedAt ? <Pill $tone="neutral">Arquivado</Pill> : resource === "materiais" && Number(record.quantity) <= Number(record.minQuantity) ? <Pill $tone="peach">Repor estoque</Pill> : <Pill $tone="green">Ativo</Pill>}</td><td>{rowActions(record)}</td></tr>)}</tbody></Table></TableCard>}
    {hasMore && <Button variant="secondary" loading={loading} onClick={() => void loadMore()}>Carregar mais registros</Button>}
    {definition.hint && <Notice>{definition.hint}</Notice>}
    <RecordEditor resource={resource} record={editing} open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={async () => { setNotice("Registro salvo."); await reload(); }} relations={relations} defaultType={section === "income" || section === "expense" ? section : undefined} dependencyError={dependencyError} />
    <RecordEditor resource="pedidos" record={null} open={Boolean(creatingOrder)} initialValues={creatingOrder} onClose={() => setCreatingOrder(undefined)} onSaved={async () => { setNotice("Pedido criado. Acompanhe em Pedidos."); await reload(); }} relations={relations} dependencyError={dependencyError} />
    <Dialog open={Boolean(archiving)} onClose={() => { if (!pendingAction) setArchiving(null); }} title={`Arquivar ${definition.singular}`} description={`Registro: ${archiving ? recordName(archiving) : ""}. O registro sai das listas ativas e permanece disponível no filtro Arquivados.`} footer={<Actions><Button variant="ghost" disabled={pendingAction} onClick={() => setArchiving(null)}>Cancelar</Button><Button variant="danger" loading={pendingAction} onClick={() => { if (archiving) void archive(archiving); }}>Confirmar arquivamento</Button></Actions>}><Stack>{resource === "movimentacoes" && <Notice>Arquivar uma movimentação reverte seu efeito no estoque. O servidor impede um saldo negativo e preserva o histórico.</Notice>}{error && <Notice role="alert">{error}</Notice>}</Stack></Dialog>
  </Page>;
}
