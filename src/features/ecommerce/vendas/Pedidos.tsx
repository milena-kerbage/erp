"use client";
import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CheckIcon, EyeIcon, UserFocusIcon, UserIcon, WhatsappLogoIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Notice, Page, PageHeader, Stack, Toolbar } from "@/features/operations/components/ui";
import { STATUS_PEDIDO, type StatusPedido } from "@/loja/lib/contas/regras";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import {
  abrirJanela, AvisoRestrito, data, dataHora, diaIso, dinheiro, ETAPA_CURTA, ETAPAS, ETAPAS_AVANCO, EtapaPill, Fatos, limparParametro, Linha, Nome, parametroDaUrl,
  plural, Rodape, Sub, CaixaTabela, TabelaResponsiva, TituloSecao, TOM_ETAPA, useDadosErp, useRestrito, whatsappHref, type DetalheCliente, type PedidoLoja,
} from "./comum";

type Filtro = StatusPedido | "todos";
type Periodo = "todos" | "hoje" | "7d" | "30d" | "90d" | "mes";
type Resposta = { pedidos: PedidoLoja[]; contagem: Record<StatusPedido, number>; pagination: { total: number; hasMore: boolean } };
const PAGINA = 20;

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "todos", label: "Todo o período" },
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
];

function desdeDoPeriodo(periodo: Periodo): string | null {
  const hoje = new Date();
  if (periodo === "todos") return null;
  if (periodo === "hoje") return diaIso(hoje);
  if (periodo === "mes") return `${diaIso(hoje).slice(0, 8)}01`;
  const dias = Number(periodo.replace("d", ""));
  return diaIso(new Date(hoje.getTime() - (dias - 1) * 86_400_000));
}

const mensagemCliente = (pedido: PedidoLoja) => `Olá, ${(pedido.nome ?? "").split(" ")[0]}! Aqui é do Ateliê Milena Kerbage, sobre o seu pedido ${pedido.numero}.`;

/**
 * Pedidos feitos no site da loja. O pedido é a conversa da vendedora com a cliente no WhatsApp: aqui fica o
 * registro (número, peças com as opções, valores "a partir de", cupom e a mensagem enviada) e a etapa,
 * que a cliente acompanha em Minha conta: Enviado pelo WhatsApp → Pagamento confirmado → Despachado → Entregue.
 */
export function PedidosEcommerce() {
  const [etapa, setEtapa] = useState<Filtro>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [pronto, setPronto] = useState(false);
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState<PedidoLoja | null>(null);

  // Links do painel e das outras telas: ?etapa=pagamento_confirmado, ?pedido=MK-1234
  useEffect(() => {
    const inicial = parametroDaUrl("etapa");
    if (inicial && inicial in STATUS_PEDIDO) setEtapa(inicial as StatusPedido);
    const numero = parametroDaUrl("pedido");
    if (numero) void erpRequest<Resposta>(`loja/pedidos?busca=${encodeURIComponent(numero)}&limit=5`).then((resposta) => {
      const pedido = resposta.pedidos.find((item) => item.numero === numero.toUpperCase());
      if (pedido) setAberto(pedido);
    }).catch(() => undefined);
    setPronto(true);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => setTermo(busca.trim()), 300); return () => window.clearTimeout(timer); }, [busca]);

  const filtros = useMemo(() => {
    const desde = desdeDoPeriodo(periodo);
    return `${termo ? `&busca=${encodeURIComponent(termo)}` : ""}${desde ? `&desde=${desde}` : ""}`;
  }, [termo, periodo]);
  const caminho = (offset: number) => `loja/pedidos?status=${etapa}&limit=${PAGINA}&offset=${offset}${filtros}`;
  const { dados, setDados, carregando, setCarregando, erro, setErro, negado, recarregar } = useDadosErp<Resposta>(pronto ? caminho(0) : null);
  const restrito = useRestrito(negado);

  async function carregarMais() {
    if (!dados) return;
    setCarregando(true);
    try {
      const proxima = await erpRequest<Resposta>(caminho(dados.pedidos.length));
      setDados({ ...proxima, pedidos: [...dados.pedidos, ...proxima.pedidos.filter((item) => !dados.pedidos.some((existente) => existente.numero === item.numero))] });
    } catch (caught) { setErro(requestError(caught)); } finally { setCarregando(false); }
  }

  const contagem = dados?.contagem;
  const abas = useMemo(() => [
    { value: "todos" as const, label: "Todos", count: contagem ? Object.values(contagem).reduce((soma, valor) => soma + valor, 0) : 0 },
    ...ETAPAS.map((chave) => ({ value: chave, label: ETAPA_CURTA[chave], count: contagem?.[chave] ?? 0 })),
  ], [contagem]);
  const pedidos = dados?.pedidos ?? [];

  function atualizado(pedido: PedidoLoja) {
    setAviso(`Pedido ${pedido.numero}: ${STATUS_PEDIDO[pedido.status]}.`);
    setAberto(pedido);
    void recarregar();
  }

  return <Page>
    <PageHeader title="Pedidos da loja" description="Pedidos feitos no site, com conta da cliente. Valores “a partir de”: preço final, frete e pagamento são combinados pela vendedora no WhatsApp." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando} onClick={() => void recarregar()}>Atualizar</Button>} />
    {restrito ? <AvisoRestrito area="Os pedidos da loja" /> : <>
      {erro && <Notice role="alert">{erro} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
      {aviso && <Notice role="status">{aviso}</Notice>}
      <Card>
        <Toolbar>
          <SearchField label="Buscar pedidos da loja" placeholder="Número, nome ou e-mail" value={busca} onChange={(event) => setBusca(event.target.value)} />
          <SelectCurto><Select label="Período" options={PERIODOS} value={periodo} onChange={setPeriodo} /></SelectCurto>
        </Toolbar>
        <Tabs items={abas} value={etapa} onChange={setEtapa} label="Etapa dos pedidos">
          {carregando && !dados ? <Empty role="status">Carregando pedidos…</Empty> : !pedidos.length ? <Empty><strong>{erro ? "A lista não pôde ser carregada." : termo || periodo !== "todos" || etapa !== "todos" ? "Nenhum pedido com estes filtros." : "Nenhum pedido ainda."}</strong><span>Os pedidos chegam quando a cliente envia a sacola pelo site.</span></Empty> :
            <CaixaTabela><TabelaResponsiva>
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Peças</th><th>A partir de</th><th>Cupom</th><th>Etapa</th><th aria-label="Ações" /></tr></thead>
              <tbody>{pedidos.map((pedido) => <tr key={pedido.numero} data-clicavel onClick={() => setAberto(pedido)}>
                <td data-principal><span><Nome>{pedido.numero}</Nome><Sub>{dataHora(pedido.criadoEm)}</Sub></span></td>
                <td data-label="Cliente">{pedido.anonimizado ? <Sub>Conta excluída</Sub> : <span><Nome>{pedido.nome}</Nome><Sub>{pedido.whatsappFormatado}</Sub></span>}</td>
                <td data-label="Peças">{pedido.quantidade}</td>
                <td data-label="A partir de"><strong>{dinheiro(pedido.totalCentavos)}</strong></td>
                <td data-label="Cupom">{pedido.cupom ? pedido.cupom.codigo : "—"}</td>
                <td data-label="Etapa"><EtapaPill status={pedido.status} curta /></td>
                <td data-acoes><Button size="sm" variant="ghost" icon={EyeIcon} onClick={(event) => { event.stopPropagation(); setAberto(pedido); }}>Ver</Button></td>
              </tr>)}</tbody>
            </TabelaResponsiva></CaixaTabela>}
        </Tabs>
        <Rodape>{plural(pedidos.length, "pedido exibido", "pedidos exibidos")}{dados && dados.pagination.total > pedidos.length ? ` de ${dados.pagination.total}` : ""}.</Rodape>
      </Card>
      {dados?.pagination.hasMore && <Button variant="secondary" loading={carregando} onClick={() => void carregarMais()}>Carregar mais pedidos</Button>}
    </>}
    <DetalhePedido pedido={aberto} onFechar={() => { setAberto(null); limparParametro("pedido"); }} onAtualizado={atualizado} />
  </Page>;
}

/* ---------- Detalhe ---------- */

function DetalhePedido({ pedido, onFechar, onAtualizado }: { pedido: PedidoLoja | null; onFechar: () => void; onAtualizado: (pedido: PedidoLoja) => void }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [cliente, setCliente] = useState<DetalheCliente | null>(null);
  const [verMensagem, setVerMensagem] = useState(false);
  const clienteId = pedido?.clienteId;

  useEffect(() => {
    setErro(""); setVerMensagem(false); setCliente(null);
    if (!clienteId) return;
    const controller = new AbortController();
    erpRequest<DetalheCliente>(`loja/clientes/${encodeURIComponent(clienteId)}`, { signal: controller.signal }).then(setCliente).catch(() => undefined);
    return () => controller.abort();
  }, [clienteId, pedido?.numero]);

  async function mudar(status: StatusPedido) {
    if (!pedido || status === pedido.status) return;
    setSalvando(true); setErro("");
    try { const { pedido: novo } = await erpRequest<{ pedido: PedidoLoja }>(`loja/pedidos/${encodeURIComponent(pedido.numero)}`, { method: "PATCH", body: { revisao: pedido.revisao, status } }); onAtualizado(novo); }
    catch (caught) { setErro(requestError(caught)); } finally { setSalvando(false); }
  }

  const opcoes = ETAPAS.map((chave) => ({ value: chave, label: STATUS_PEDIDO[chave], leading: <Bolinha $tom={TOM_ETAPA[chave]} /> }));
  const whatsapp = pedido && !pedido.anonimizado && pedido.whatsapp ? whatsappHref(pedido.whatsapp, mensagemCliente(pedido)) : null;

  return <Dialog open={Boolean(pedido)} onClose={() => { if (!salvando) onFechar(); }} width="44rem" title={pedido ? `Pedido ${pedido.numero}` : "Pedido"} description={pedido ? `Enviado em ${dataHora(pedido.criadoEm)} · ${plural(pedido.quantidade, "peça", "peças")} · a partir de ${dinheiro(pedido.totalCentavos)}` : undefined}
    footer={<Actions>{whatsapp && <Button icon={WhatsappLogoIcon} onClick={() => abrirJanela(whatsapp)}>Conversar no WhatsApp</Button>}<Button variant="ghost" disabled={salvando} onClick={onFechar}>Fechar</Button></Actions>}>
    {pedido && <Stack>
      <section aria-label="Etapa do pedido">
        <TituloSecao>Etapa</TituloSecao>
        <LinhaDoTempo pedido={pedido} />
        <EtapaCampo><Select label="Mudar etapa" options={opcoes} value={pedido.status} onChange={(status) => void mudar(status)} hint={salvando ? "Salvando…" : "A cliente vê a etapa em Minha conta."} /></EtapaCampo>
        {erro && <Notice role="alert">{erro}</Notice>}
      </section>

      <section aria-label="Peças do pedido">
        <TituloSecao>Peças ({pedido.quantidade})</TituloSecao>
        <Itens>{pedido.itens.map((item, indice) => <li key={`${item.nome}-${indice}`}>
          <div><strong>{item.quantidade}× {item.nome}</strong>{item.codigo && <Sub>Cód. {item.codigo}</Sub>}
            {item.detalhes.length > 0 && <Opcoes>{item.detalhes.map((detalhe) => <li key={detalhe}>{detalhe}</li>)}</Opcoes>}
            {item.modulos?.length ? <Opcoes>{item.modulos.map((modulo) => <li key={modulo.nome}>{modulo.nome}{modulo.detalhe ? ` (${modulo.detalhe})` : ""}: a partir de {dinheiro(modulo.precoCentavos)}</li>)}</Opcoes> : null}
          </div>
          <Valor>{dinheiro(item.precoCentavos * item.quantidade)}{item.quantidade > 1 && <Sub>{dinheiro(item.precoCentavos)} cada</Sub>}</Valor>
        </li>)}</Itens>
        <Totais>
          <dt>Subtotal</dt><dd>{dinheiro(pedido.subtotalCentavos)}</dd>
          {pedido.cupom && <><dt>Cupom {pedido.cupom.codigo}{pedido.cupom.percentual ? ` (${pedido.cupom.percentual}%)` : ""}</dt><dd>−{dinheiro(pedido.descontoCentavos)}</dd></>}
          <dt><strong>Total “a partir de”</strong></dt><dd><strong>{dinheiro(pedido.totalCentavos)}</strong></dd>
        </Totais>
        <Sub>5% OFF no Pix e frete a consultar: o valor final é combinado pela vendedora no WhatsApp.</Sub>
      </section>

      <section aria-label="Cliente e entrega">
        <TituloSecao>Cliente e entrega</TituloSecao>
        {pedido.anonimizado ? <Notice>A cliente excluiu a conta (LGPD): o pedido ficou sem nome e contato.</Notice> : <Fatos>
          <dt>Cliente</dt><dd>{pedido.nome}</dd>
          <dt>E-mail</dt><dd>{pedido.email}</dd>
          <dt>WhatsApp</dt><dd>{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">{pedido.whatsappFormatado}</a> : pedido.whatsappFormatado}</dd>
          <dt>Entrega</dt><dd>{pedido.retirar ? "Retirada no ateliê" : pedido.local ? `Entrega em ${pedido.local} (frete a consultar)` : "A combinar"}</dd>
          {pedido.observacoes && <><dt>Observações</dt><dd>{pedido.observacoes}</dd></>}
          {cliente?.lead && <><dt>Lead no CRM</dt><dd>{cliente.lead.funil} · {cliente.lead.etapa}</dd></>}
        </Fatos>}
        {pedido.clienteId && <Linha>
          <Button size="sm" variant="secondary" icon={UserIcon} href={`/ecommerce/clientes?cliente=${encodeURIComponent(pedido.clienteId)}`}>Ver cliente</Button>
          {cliente?.lead && <Button size="sm" variant="secondary" icon={UserFocusIcon} href={cliente.lead.href}>Ver lead no CRM</Button>}
        </Linha>}
      </section>

      <section aria-label="Mensagem enviada">
        <TituloSecao>Mensagem enviada pelo WhatsApp <Button size="sm" variant="ghost" aria-expanded={verMensagem} onClick={() => setVerMensagem(!verMensagem)}>{verMensagem ? "Esconder" : "Mostrar"}</Button></TituloSecao>
        {verMensagem && <Mensagem>{pedido.mensagem}</Mensagem>}
      </section>
    </Stack>}
  </Dialog>;
}

/** Linha do tempo das etapas: as concluídas com ✓, a atual em destaque; cancelado mostra o cancelamento. */
function LinhaDoTempo({ pedido }: { pedido: PedidoLoja }) {
  const cancelado = pedido.status === "cancelado";
  const atual = pedido.status === "cancelado" ? -1 : ETAPAS_AVANCO.indexOf(pedido.status);
  return <Tempo aria-label="Linha do tempo do pedido">
    {ETAPAS_AVANCO.map((chave, indice) => {
      const feito = !cancelado && indice <= atual;
      const quando = indice === 0 ? dataHora(pedido.criadoEm) : !cancelado && indice === atual ? `atualizado em ${dataHora(pedido.atualizadoEm)}` : feito ? "concluído" : "";
      return <Passo key={chave} $tom={feito ? TOM_ETAPA[chave] : "neutral"} $feito={feito} $atual={!cancelado && indice === atual} aria-current={!cancelado && indice === atual ? "step" : undefined}>
        <span aria-hidden>{feito ? <CheckIcon size={12} weight="bold" /> : indice + 1}</span>
        <div><strong>{STATUS_PEDIDO[chave]}</strong>{quando && <Sub>{quando}</Sub>}</div>
      </Passo>;
    })}
    {cancelado && <Passo $tom="rose" $feito $atual aria-current="step"><span aria-hidden><XIcon size={12} weight="bold" /></span><div><strong>Cancelado</strong><Sub>em {data(pedido.atualizadoEm)}</Sub></div></Passo>}
  </Tempo>;
}

const SelectCurto = styled.div`&&& { flex: 0 0 13rem; } min-width: 0; ${({ theme }) => theme.media.sm} { &&& { flex: 1 1 100%; } }`;
const EtapaCampo = styled.div`max-width: 22rem; margin-top: ${({ theme }) => theme.spacing(4)};`;
const Bolinha = styled("span", transientOptions)<{ $tom: Tone }>`display: block; width: 0.625rem; height: 0.625rem; border-radius: 50%; background: ${({ theme, $tom }) => theme.tones[$tom].fg};`;
const Tempo = styled.ol`display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: ${({ theme }) => theme.spacing(2)}; list-style: none;`;
const Passo = styled("li", transientOptions)<{ $tom: Tone; $feito: boolean; $atual: boolean }>`
  display: flex; align-items: flex-start; gap: ${({ theme }) => theme.spacing(2)}; padding: ${({ theme }) => theme.spacing(2.5, 3)};
  border: 1px solid ${({ theme, $tom, $atual }) => ($atual ? theme.tones[$tom].soft : theme.colors.border.subtle)}; border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $tom, $atual }) => ($atual ? theme.tones[$tom].bg : "transparent")}; font-size: 0.8125rem; opacity: ${({ $feito }) => ($feito ? 1 : 0.7)};
  > span { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; border-radius: 50%; font-size: 0.6875rem; font-weight: 600;
    background: ${({ theme, $tom, $feito }) => ($feito ? theme.tones[$tom].fg : theme.palette.neutral[100])}; color: ${({ theme, $feito }) => ($feito ? theme.palette.neutral[0] : theme.colors.text.muted)}; }
  strong { display: block; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; line-height: 1.3; }
`;
const Itens = styled.ul`display: flex; flex-direction: column; list-style: none; font-size: 0.8125rem; > li { display: flex; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(2.5, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; } > li > div { min-width: 0; } strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }`;
const Opcoes = styled.ul`margin-top: ${({ theme }) => theme.spacing(1)}; padding-left: ${({ theme }) => theme.spacing(4)}; color: ${({ theme }) => theme.colors.text.secondary}; font-size: 0.75rem; line-height: 1.6;`;
const Valor = styled.span`flex-shrink: 0; text-align: right; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap;`;
const Totais = styled.dl`display: grid; grid-template-columns: 1fr auto; gap: ${({ theme }) => theme.spacing(1.5, 4)}; margin: ${({ theme }) => theme.spacing(3, 0, 2)}; font-size: 0.8125rem; dt { color: ${({ theme }) => theme.colors.text.secondary}; } dd { text-align: right; color: ${({ theme }) => theme.colors.text.primary}; } strong { font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }`;
const Mensagem = styled.pre`padding: ${({ theme }) => theme.spacing(3, 4)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font: inherit; font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 20rem; overflow-y: auto; color: ${({ theme }) => theme.colors.text.secondary};`;
