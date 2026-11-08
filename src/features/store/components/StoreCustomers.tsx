"use client";
import { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CopyIcon, EyeIcon, KeyIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SearchField } from "@/components/ui/SearchField";
import { copyText } from "@/lib/clipboard";
import { useCurrentUser } from "@/features/settings/store";
import { ErpRequestError, erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Notice, Page, PageHeader, Pill, Stack, Table, TableCard, Toolbar } from "@/features/operations/components/ui";
import { COMO_CONHECEU, TIPO_DATA_BEBE, type CupomConta } from "@/loja/lib/contas/regras";
import { dateTime, money, OrderStatusPill, whatsappHref, type StoreOrder } from "./common";

type Customer = { id: string; avatar?: string; nome: string; email: string; whatsapp: string; whatsappFormatado: string; criadaEm: string; ultimoAcesso: string | null; pedidos: number; cupom: CupomConta | null };
type ListResponse = { clientes: Customer[]; pagination: { total: number; hasMore: boolean } };
type Detail = {
  cliente: Customer & { perfil: Record<string, string>; termosVersao: string; termosAceitosEm: string; status: string };
  cupom: CupomConta | null;
  pedidos: StoreOrder[];
  redefinicao: { criadaEm: string; expiraEm: string; usadaEm: string | null } | null;
};
type ResetLink = { link: string; expiraEm: string };

const PAGE = 25;

/**
 * Clientes com conta na loja (cadastro no site). As contas são separadas das da equipe: aqui a equipe
 * só consulta e, quando a cliente esquece a senha (não há e-mail configurado), gera um link de
 * redefinição que aparece UMA vez para a vendedora mandar pelo WhatsApp.
 */
export function StoreCustomers() {
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [reset, setReset] = useState<ResetLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const path = useCallback((offset: number) => `loja/clientes?limit=${PAGE}&offset=${offset}${query ? `&busca=${encodeURIComponent(query)}` : ""}`, [query]);
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
    try { const next = await erpRequest<ListResponse>(path(data.clientes.length)); setData({ ...next, clientes: [...data.clientes, ...next.clientes.filter((item) => !data.clientes.some((existing) => existing.id === item.id))] }); }
    catch (caught) { setError(requestError(caught)); } finally { setLoading(false); }
  }
  async function open(id: string) {
    setDetailError(""); setReset(null); setCopied(false);
    try { setDetail(await erpRequest<Detail>(`loja/clientes/${encodeURIComponent(id)}`)); }
    catch (caught) { setError(requestError(caught)); }
  }
  async function generate() {
    if (!detail) return;
    setBusy(true); setDetailError(""); setCopied(false);
    try { setReset(await erpRequest<ResetLink>(`loja/clientes/${encodeURIComponent(detail.cliente.id)}/redefinicao`, { method: "POST", body: {} })); }
    catch (caught) { setDetailError(requestError(caught)); }
    finally { setBusy(false); }
  }

  const customers = data?.clientes ?? [];
  const restricted = currentUser?.permission === "member" || denied;
  const resetMessage = detail && reset ? `Olá, ${detail.cliente.nome.split(" ")[0]}! Aqui é do Ateliê Milena Kerbage. Para criar uma nova senha da sua conta na loja, abra este link (vale por 2 horas e só uma vez):\n${reset.link}` : "";

  return <Page>
    <PageHeader title="Clientes da loja" description="Contas criadas no site da loja. Os pedidos seguem pelo WhatsApp; aqui ficam os dados, os pedidos e o cupom de primeira compra." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    {restricted ? <Notice role="alert">As contas de clientes da loja são consultadas pela administração e pela gestão do ateliê. Seu perfil não tem acesso a esta área.</Notice> : <>
      {error && <Notice role="alert">{error} <Button variant="ghost" size="sm" onClick={() => void load()}>Tentar novamente</Button></Notice>}
      <Card>
        <Toolbar><SearchField label="Buscar clientes da loja" placeholder="Nome, e-mail ou WhatsApp" value={search} onChange={(event) => setSearch(event.target.value)} /></Toolbar>
        {loading && !data ? <Empty role="status">Carregando clientes…</Empty> : !customers.length ? <Empty><strong>{error ? "A lista não pôde ser carregada." : query ? "Nenhuma cliente encontrada." : "Nenhuma conta criada na loja ainda."}</strong><span>As contas são criadas no site, no cadastro rápido do pedido ou em Minha conta.</span></Empty> :
          <TableCard><Table>
            <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Cadastro</th><th>Pedidos</th><th>Cupom 5%</th><th aria-label="Ações" /></tr></thead>
            <tbody>{customers.map((customer) => <tr key={customer.id}>
              <td><Who><Avatar name={customer.nome} src={customer.avatar} seed={customer.id} size="sm" shape="circle" /><span><Name>{customer.nome}</Name><Sub>{customer.email}</Sub></span></Who></td>
              <td>{customer.whatsappFormatado}</td>
              <td>{dateTime(customer.criadaEm)}</td>
              <td>{customer.pedidos}</td>
              <td>{customer.cupom ? <Pill $tone={customer.cupom.usado ? "neutral" : "green"}>{customer.cupom.usado ? "Usado" : "Disponível"}</Pill> : "—"}</td>
              <td><Button size="sm" variant="ghost" icon={EyeIcon} onClick={() => void open(customer.id)}>Ver</Button></td>
            </tr>)}</tbody>
          </Table></TableCard>}
        <small>{customers.length} cliente(s) exibida(s){data && data.pagination.total > customers.length ? ` de ${data.pagination.total}` : ""}.</small>
      </Card>
      {data?.pagination.hasMore && <Button variant="secondary" loading={loading} onClick={() => void loadMore()}>Carregar mais</Button>}
      <Notice>Esqueceu a senha? A loja não envia e-mail: abra a cliente, gere o link de redefinição e mande pelo WhatsApp. O link vale por 2 horas, funciona uma vez e aparece só agora (não fica guardado).</Notice>
    </>}

    <Dialog open={Boolean(detail)} onClose={() => { if (!busy) { setDetail(null); setReset(null); } }} title={detail?.cliente.nome ?? "Cliente"} description={detail ? `Conta criada em ${dateTime(detail.cliente.criadaEm)}` : undefined} footer={<Actions><Button variant="ghost" disabled={busy} onClick={() => { setDetail(null); setReset(null); }}>Fechar</Button></Actions>}>
      {detail && <Stack>
        <Who><Avatar name={detail.cliente.nome} src={detail.cliente.avatar} seed={detail.cliente.id} size="lg" shape="circle" /><span><Name>{detail.cliente.nome}</Name><Sub>Cliente da loja online{detail.pedidos.length ? ` · ${detail.pedidos.length} pedido(s)` : ""}</Sub></span></Who>
        <Facts>
          <dt>E-mail</dt><dd>{detail.cliente.email}</dd>
          <dt>WhatsApp</dt><dd><a href={whatsappHref(detail.cliente.whatsapp)} target="_blank" rel="noopener noreferrer">{detail.cliente.whatsappFormatado}</a></dd>
          <dt>Último acesso</dt><dd>{detail.cliente.ultimoAcesso ? dateTime(detail.cliente.ultimoAcesso) : "—"}</dd>
          <dt>Termos aceitos</dt><dd>versão {detail.cliente.termosVersao}, em {dateTime(detail.cliente.termosAceitosEm)}</dd>
          {detail.cliente.perfil.cpf && <><dt>CPF</dt><dd>{detail.cliente.perfil.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</dd></>}
          {(detail.cliente.perfil.endereco || detail.cliente.perfil.cidade) && <><dt>Endereço</dt><dd>{[detail.cliente.perfil.endereco, [detail.cliente.perfil.cidade, detail.cliente.perfil.uf].filter(Boolean).join("/"), detail.cliente.perfil.cep && `CEP ${detail.cliente.perfil.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`].filter(Boolean).join(" · ")}</dd></>}
          {detail.cliente.perfil.bebeData && <><dt>{TIPO_DATA_BEBE[detail.cliente.perfil.bebeDataTipo as keyof typeof TIPO_DATA_BEBE] ?? "Data do bebê"}</dt><dd>{detail.cliente.perfil.bebeData.split("-").reverse().join("/")}</dd></>}
          {detail.cliente.perfil.bebeNome && <><dt>Nome do bebê</dt><dd>{detail.cliente.perfil.bebeNome}</dd></>}
          {detail.cliente.perfil.comoConheceu && <><dt>Como conheceu</dt><dd>{COMO_CONHECEU[detail.cliente.perfil.comoConheceu as keyof typeof COMO_CONHECEU] ?? detail.cliente.perfil.comoConheceu}</dd></>}
          {detail.cliente.perfil.preferencias && <><dt>Preferências</dt><dd>{detail.cliente.perfil.preferencias}</dd></>}
          <dt>Cupom 5%</dt><dd>{detail.cupom ? `${detail.cupom.codigo} · ${detail.cupom.usado ? `usado no pedido ${detail.cupom.pedido}` : "disponível"}` : "—"}</dd>
        </Facts>
        <section aria-label="Pedidos da cliente">
          <SectionTitle>Pedidos ({detail.pedidos.length})</SectionTitle>
          {detail.pedidos.length ? <Orders>{detail.pedidos.map((order) => <li key={order.numero}><strong>{order.numero}</strong> · {dateTime(order.criadoEm)} · a partir de {money(order.totalCentavos)} <OrderStatusPill status={order.status} label={order.statusRotulo} /></li>)}</Orders> : <Sub>Nenhum pedido ainda.</Sub>}
        </section>
        <section aria-label="Redefinição de senha">
          <SectionTitle>Senha</SectionTitle>
          {detail.redefinicao && !reset && <Sub>Último link gerado em {dateTime(detail.redefinicao.criadaEm)} · {detail.redefinicao.usadaEm ? `usado em ${dateTime(detail.redefinicao.usadaEm)}` : new Date(detail.redefinicao.expiraEm) < new Date() ? "expirado" : `vale até ${dateTime(detail.redefinicao.expiraEm)}`}</Sub>}
          {reset ? <Stack>
            <Notice role="status">Link gerado. Ele aparece só agora: copie e envie pelo WhatsApp da cliente. Vale até {dateTime(reset.expiraEm)} e funciona uma vez; gerar outro invalida este.</Notice>
            <LinkBox aria-label="Link de redefinição">{reset.link}</LinkBox>
            <Actions>
              <Button size="sm" icon={CopyIcon} onClick={async () => setCopied(await copyText(reset.link))}>{copied ? "Copiado" : "Copiar link"}</Button>
              <Button size="sm" variant="secondary" icon={WhatsappLogoIcon} onClick={() => window.open(whatsappHref(detail.cliente.whatsapp, resetMessage), "_blank", "noopener,noreferrer")}>Abrir conversa com a mensagem</Button>
            </Actions>
          </Stack> : <Button size="sm" variant="secondary" icon={KeyIcon} loading={busy} onClick={() => void generate()}>Gerar link de redefinição de senha</Button>}
          {detailError && <Notice role="alert">{detailError}</Notice>}
        </section>
      </Stack>}
    </Dialog>
  </Page>;
}

const Who = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0;`;
const Name = styled.span`display: block; font-weight: ${({ theme }) => theme.fontWeights.medium};`;
const Sub = styled.span`display: block; color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem;`;
const Facts = styled.dl`display: grid; grid-template-columns: minmax(7rem, auto) 1fr; gap: ${({ theme }) => theme.spacing(2, 4)}; font-size: 0.8125rem; dt { color: ${({ theme }) => theme.colors.text.muted}; } dd { color: ${({ theme }) => theme.colors.text.primary}; overflow-wrap: anywhere; } a { color: inherit; text-decoration: underline; }`;
const SectionTitle = styled.h3`font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; margin-bottom: ${({ theme }) => theme.spacing(2)};`;
const Orders = styled.ul`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; list-style: none; font-size: 0.8125rem;`;
const LinkBox = styled.code`display: block; padding: ${({ theme }) => theme.spacing(3)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font-size: 0.75rem; overflow-wrap: anywhere; user-select: all;`;
