"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CaretDownIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Tabs } from "@/components/ui/Tabs";
import { useCurrentUser } from "@/features/settings/store";
import { ErpRequestError, erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Label, NativeSelect, Notice, Page, PageHeader, Toolbar } from "@/features/operations/components/ui";
import { STATUS_PEDIDO, type StatusPedido } from "@/loja/lib/contas/regras";
import { dateTime, money, OrderStatusPill, whatsappHref, type StoreOrder } from "./common";

type Filter = StatusPedido | "todos";
type ListResponse = { pedidos: StoreOrder[]; contagem: Record<StatusPedido, number>; pagination: { total: number; hasMore: boolean } };
const PAGE = 20;

/**
 * Pedidos feitos no site da loja. O pedido é a conversa da vendedora com a cliente no WhatsApp: aqui
 * fica o registro (número, peças, valores "a partir de", cupom e a mensagem enviada) e a situação,
 * que a cliente acompanha em Minha conta.
 */
export function StoreOrders() {
  const currentUser = useCurrentUser();
  const [status, setStatus] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [denied, setDenied] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const path = useCallback((offset: number) => `loja/pedidos?status=${status}&limit=${PAGE}&offset=${offset}${query ? `&busca=${encodeURIComponent(query)}` : ""}`, [status, query]);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(""); setDenied(false);
    try { setData(await erpRequest<ListResponse>(path(0), { signal })); }
    catch (caught) { if (!signal?.aborted) { setError(requestError(caught)); setDenied(caught instanceof ErpRequestError && caught.status === 403); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [path]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  async function loadMore() {
    if (!data) return;
    setLoading(true);
    try { const next = await erpRequest<ListResponse>(path(data.pedidos.length)); setData({ ...next, pedidos: [...data.pedidos, ...next.pedidos.filter((item) => !data.pedidos.some((existing) => existing.numero === item.numero))] }); }
    catch (caught) { setError(requestError(caught)); } finally { setLoading(false); }
  }
  async function change(order: StoreOrder, next: StatusPedido) {
    setBusy(order.numero); setError(""); setNotice("");
    try { await erpRequest(`loja/pedidos/${encodeURIComponent(order.numero)}`, { method: "PATCH", body: { revisao: order.revisao, status: next } }); setNotice(`Pedido ${order.numero}: ${STATUS_PEDIDO[next]}.`); await load(); }
    catch (caught) { setError(requestError(caught)); } finally { setBusy(""); }
  }

  const counts = data?.contagem;
  const tabs = useMemo(() => [
    { value: "todos" as const, label: "Todos", count: counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : 0 },
    ...(Object.keys(STATUS_PEDIDO) as StatusPedido[]).map((key) => ({ value: key, label: STATUS_PEDIDO[key], count: counts?.[key] ?? 0 })),
  ], [counts]);
  const orders = data?.pedidos ?? [];
  const restricted = currentUser?.permission === "member" || denied;

  return <Page>
    <PageHeader title="Pedidos da loja" description="Pedidos feitos no site, com conta da cliente. Valores “a partir de”: preço, frete e pagamento são combinados pela vendedora no WhatsApp." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    {restricted ? <Notice role="alert">Os pedidos da loja são acompanhados pela administração e pela gestão do ateliê. Seu perfil não tem acesso a esta área.</Notice> : <>
      {error && <Notice role="alert">{error} <Button variant="ghost" size="sm" onClick={() => void load()}>Tentar novamente</Button></Notice>}
      {notice && <Notice role="status">{notice}</Notice>}
      <Card>
        <Toolbar><SearchField label="Buscar pedidos da loja" placeholder="Número, nome ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></Toolbar>
        <Tabs items={tabs} value={status} onChange={setStatus} label="Situação dos pedidos">
          {loading && !data ? <Empty role="status">Carregando pedidos…</Empty> : !orders.length ? <Empty><strong>{error ? "A lista não pôde ser carregada." : "Nenhum pedido neste filtro."}</strong><span>Os pedidos chegam quando a cliente envia a sacola pelo site.</span></Empty> :
            <List>{orders.map((order) => <Item key={order.numero} aria-labelledby={`pedido-${order.numero}`}>
              <Head>
                <div>
                  <h3 id={`pedido-${order.numero}`}>{order.numero}</h3>
                  <Meta>{dateTime(order.criadoEm)} · {order.anonimizado ? "Cliente excluiu a conta" : <>{order.nome} · {order.email}</>}</Meta>
                </div>
                <OrderStatusPill status={order.status} label={order.statusRotulo} />
              </Head>
              <Meta>{order.quantidade} peça(s) · a partir de <strong>{money(order.totalCentavos)}</strong>{order.cupom ? ` · cupom ${order.cupom.codigo} (${order.cupom.percentual}%: −${money(order.descontoCentavos)})` : ""} · {order.retirar ? "retirada no ateliê" : order.local ? `entrega: ${order.local}` : "entrega a combinar"}</Meta>
              <Actions>
                <Label>Situação<NativeSelect value={order.status} disabled={Boolean(busy)} onChange={(event) => void change(order, event.target.value as StatusPedido)}>{(Object.keys(STATUS_PEDIDO) as StatusPedido[]).map((key) => <option key={key} value={key}>{STATUS_PEDIDO[key]}</option>)}</NativeSelect></Label>
                {!order.anonimizado && order.whatsapp && <Button size="sm" variant="secondary" icon={WhatsappLogoIcon} onClick={() => window.open(whatsappHref(order.whatsapp ?? "", `Olá, ${(order.nome ?? "").split(" ")[0]}! Aqui é do Ateliê Milena Kerbage, sobre o seu pedido ${order.numero}.`), "_blank", "noopener,noreferrer")}>Conversar no WhatsApp</Button>}
                <Button size="sm" variant="ghost" icon={CaretDownIcon} aria-expanded={open === order.numero} onClick={() => setOpen(open === order.numero ? null : order.numero)}>{open === order.numero ? "Esconder detalhes" : "Ver peças e mensagem"}</Button>
              </Actions>
              {open === order.numero && <Details>
                <ul>{order.itens.map((item, index) => <li key={`${item.nome}-${index}`}><strong>{item.quantidade}× {item.nome}</strong>{item.codigo ? ` (cód. ${item.codigo})` : ""} · a partir de {money(item.precoCentavos * item.quantidade)}{item.detalhes.length ? <Meta>{item.detalhes.join(" · ")}</Meta> : null}{item.modulos?.length ? <Meta>{item.modulos.map((module) => module.nome).join(", ")}</Meta> : null}</li>)}</ul>
                {order.observacoes && <Meta>Observações: {order.observacoes}</Meta>}
                <Message>{order.mensagem}</Message>
              </Details>}
            </Item>)}</List>}
        </Tabs>
        <small>{orders.length} pedido(s) exibido(s){data && data.pagination.total > orders.length ? ` de ${data.pagination.total}` : ""}.</small>
      </Card>
      {data?.pagination.hasMore && <Button variant="secondary" loading={loading} onClick={() => void loadMore()}>Carregar mais pedidos</Button>}
    </>}
  </Page>;
}

const List = styled.div`display: flex; flex-direction: column; margin-top: ${({ theme }) => theme.spacing(2)};`;
const Item = styled.article`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(5, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; min-width: 0; &:last-of-type { border-bottom: 0; } h3 { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }`;
const Head = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; > div { min-width: 0; }`;
const Meta = styled.p`font-size: 0.8125rem; line-height: 1.6; color: ${({ theme }) => theme.colors.text.muted}; overflow-wrap: anywhere; strong { color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.medium}; }`;
const Details = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; ul { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; list-style: none; font-size: 0.8125rem; }`;
const Message = styled.pre`padding: ${({ theme }) => theme.spacing(3, 4)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font: inherit; font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 24rem; overflow-y: auto; color: ${({ theme }) => theme.colors.text.secondary};`;
