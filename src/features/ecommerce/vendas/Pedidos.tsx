"use client";
import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, BabyIcon, CheckIcon, EyeIcon, PackageIcon, TruckIcon, UserFocusIcon, UserIcon, WhatsappLogoIcon, XIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Notice, Page, PageHeader, Toolbar } from "@/features/operations/components/ui";
import { STATUS_PEDIDO, type StatusPedido } from "@/loja/lib/contas/regras";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import {
  abrirJanela, AvisoRestrito, data, dataHora, diaIso, dinheiro, ETAPA_CURTA, ETAPAS, ETAPAS_AVANCO, EtapaPill, limparParametro, Linha, Nome, parametroDaUrl,
  plural, Rodape, Sub, CaixaTabela, TabelaResponsiva, TOM_ETAPA, useDadosErp, useRestrito, whatsappHref, type DetalheCliente, type PedidoLoja,
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
  // A foto de cada peça e o que a cliente contou do bebê (a mesma rota do cartão do pedido na conversa).
  const [extra, setExtra] = useState<ExtraDoPedido | null>(null);
  const [semFoto, setSemFoto] = useState<Record<number, boolean>>({});
  const clienteId = pedido?.clienteId;
  const numero = pedido?.numero;

  useEffect(() => {
    setExtra(null); setSemFoto({});
    if (!numero) return;
    const controller = new AbortController();
    erpRequest<ExtraDoPedido>(`loja/pedidos/${encodeURIComponent(numero)}`, { signal: controller.signal }).then(setExtra).catch(() => undefined);
    return () => controller.abort();
  }, [numero]);

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

  const bebe = extra?.cliente?.bebe;
  return <Dialog open={Boolean(pedido)} onClose={() => { if (!salvando) onFechar(); }} width="66rem" title={pedido ? `Pedido ${pedido.numero}` : "Pedido"} description={pedido ? `Enviado em ${dataHora(pedido.criadoEm)} · ${plural(pedido.quantidade, "peça", "peças")} · a partir de ${dinheiro(pedido.totalCentavos)}` : undefined}
    footer={<Actions>{whatsapp && <Button icon={WhatsappLogoIcon} onClick={() => abrirJanela(whatsapp)}>Conversar no WhatsApp</Button>}<Button variant="ghost" disabled={salvando} onClick={onFechar}>Fechar</Button></Actions>}>
    {pedido && <Corpo>
      {/* À esquerda, o que foi pedido (com a foto de cada peça) e os valores. À direita, o andamento, a cliente e a entrega. */}
      <Principal>
        <Bloco aria-label="Peças do pedido">
          <TituloBloco>Peças <em>{pedido.quantidade}</em></TituloBloco>
          <Itens>{pedido.itens.map((item, indice) => {
            const foto = extra?.pedido.itens[indice]?.foto;
            const detalhes = [...item.detalhes, ...(item.modulos ?? []).map((modulo) => `${modulo.nome}${modulo.detalhe ? ` (${modulo.detalhe})` : ""}: a partir de ${dinheiro(modulo.precoCentavos)}`)];
            return <li key={`${item.nome}-${indice}`}>
              <Foto>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {foto && !semFoto[indice] ? <img src={foto.src} alt={foto.alt || ""} loading="lazy" decoding="async" onError={() => setSemFoto((atual) => ({ ...atual, [indice]: true }))} /> : <PackageIcon size={20} aria-hidden />}
                {item.quantidade > 1 && <b>{item.quantidade}×</b>}
              </Foto>
              <div>
                <strong>{item.nome}</strong>
                {item.codigo && <Sub>Cód. {item.codigo}</Sub>}
                {detalhes.length > 0 && <Escolhas>{detalhes.map((detalhe) => <li key={detalhe}>{detalhe}</li>)}</Escolhas>}
              </div>
              <Valor>{dinheiro(item.precoCentavos * item.quantidade)}<Sub>{item.quantidade > 1 ? `${item.quantidade} × ${dinheiro(item.precoCentavos)}` : "a partir de"}</Sub></Valor>
            </li>;
          })}</Itens>
        </Bloco>

        <Bloco aria-label="Valores do pedido">
          <TituloBloco>Valores</TituloBloco>
          <Totais>
            <dt>Subtotal</dt><dd>{dinheiro(pedido.subtotalCentavos)}</dd>
            {pedido.cupom && <><dt>Cupom <code>{pedido.cupom.codigo}</code>{pedido.cupom.percentual ? ` (${pedido.cupom.percentual}%)` : ""}</dt><dd data-desconto>−{dinheiro(pedido.descontoCentavos)}</dd></>}
            <dt data-total>Total “a partir de”</dt><dd data-total>{dinheiro(pedido.totalCentavos)}</dd>
          </Totais>
          <Sub>5% OFF no Pix e frete a consultar: o valor final é combinado pela vendedora no WhatsApp.</Sub>
        </Bloco>

        <Bloco aria-label="Mensagem enviada">
          <TituloBloco>Mensagem enviada pelo WhatsApp <Button size="sm" variant="ghost" aria-expanded={verMensagem} onClick={() => setVerMensagem(!verMensagem)}>{verMensagem ? "Esconder" : "Mostrar"}</Button></TituloBloco>
          {verMensagem && <Mensagem>{pedido.mensagem}</Mensagem>}
        </Bloco>
      </Principal>

      <Lateral>
        <Bloco aria-label="Andamento do pedido">
          <TituloBloco>Andamento <EtapaPill status={pedido.status} curta /></TituloBloco>
          <LinhaDoTempo pedido={pedido} />
          <Select label="Mudar etapa" options={opcoes} value={pedido.status} onChange={(status) => void mudar(status)} hint={salvando ? "Salvando…" : "A cliente vê a etapa em Minha conta."} />
          {erro && <Notice role="alert">{erro}</Notice>}
        </Bloco>

        <Bloco aria-label="Cliente">
          <TituloBloco>Cliente</TituloBloco>
          {pedido.anonimizado ? <Sub>A cliente excluiu a conta (LGPD): o pedido ficou sem nome e contato.</Sub> : <>
            <Quem>
              <Avatar name={pedido.nome} seed={pedido.clienteId ?? pedido.nome} size="md" shape="circle" />
              <span><Nome>{pedido.nome}</Nome><Sub>{pedido.email}</Sub></span>
            </Quem>
            <Dados>
              <li><WhatsappLogoIcon size={15} aria-hidden />{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">{pedido.whatsappFormatado}</a> : pedido.whatsappFormatado}</li>
              {bebe && <li><BabyIcon size={15} aria-hidden /><span>{bebe.nome || "Bebê"}{bebe.data ? ` · ${bebe.tipo === "nascimento" ? "nasceu em" : "previsão"} ${data(`${bebe.data}T12:00:00-03:00`)}` : ""}</span></li>}
              {cliente?.lead && <li><UserFocusIcon size={15} aria-hidden /><span>Lead: {cliente.lead.funil} · {cliente.lead.etapa}</span></li>}
            </Dados>
          </>}
          {pedido.clienteId && <Linha>
            <Button size="sm" variant="secondary" icon={UserIcon} href={`/ecommerce/clientes?cliente=${encodeURIComponent(pedido.clienteId)}`}>Ver cliente</Button>
            {cliente?.lead && <Button size="sm" variant="secondary" icon={UserFocusIcon} href={cliente.lead.href}>Ver lead</Button>}
          </Linha>}
        </Bloco>

        <Bloco aria-label="Entrega">
          <TituloBloco>Entrega</TituloBloco>
          <Dados>
            <li><TruckIcon size={15} aria-hidden /><span>{pedido.retirar ? "Retirada no ateliê" : pedido.local ? `Entrega em ${pedido.local}` : "A combinar"}{!pedido.retirar && <Sub>Frete a consultar</Sub>}</span></li>
          </Dados>
          {pedido.observacoes && <Observacao><Sub>Observações da cliente</Sub>{pedido.observacoes}</Observacao>}
        </Bloco>
      </Lateral>
    </Corpo>}
  </Dialog>;
}

/** O que a rota do pedido devolve a mais: a foto de cada peça e o bebê que a cliente informou na conta. */
type ExtraDoPedido = {
  pedido: { itens: { foto?: { src: string; alt: string } | null }[] };
  cliente: { nome: string; cidade: string; bebe: { nome: string; data: string; tipo: "" | "prevista" | "nascimento" } | null } | null;
};

/**
 * Linha do tempo vertical: cada etapa com o seu marcador ligado ao próximo por um fio. As concluídas ficam cheias
 * (com ✓), a atual ganha o anel e a data, e as que faltam ficam vazias. Pedido cancelado: um aviso no lugar.
 */
function LinhaDoTempo({ pedido }: { pedido: PedidoLoja }) {
  if (pedido.status === "cancelado") return <Cancelado><XIcon size={14} weight="bold" aria-hidden /> Pedido cancelado em {data(pedido.atualizadoEm)}</Cancelado>;
  const atual = ETAPAS_AVANCO.findIndex((etapa) => etapa === pedido.status);
  return <Tempo aria-label="Linha do tempo do pedido">
    {ETAPAS_AVANCO.map((chave, indice) => {
      const feito = indice < atual, agora = indice === atual;
      const quando = indice === 0 ? dataHora(pedido.criadoEm) : agora ? `desde ${dataHora(pedido.atualizadoEm)}` : feito ? "concluído" : "aguardando";
      return <Passo key={chave} $tom={TOM_ETAPA[chave]} $estado={feito ? "feito" : agora ? "agora" : "falta"} aria-current={agora ? "step" : undefined}>
        <i aria-hidden>{feito ? <CheckIcon size={11} weight="bold" /> : agora ? <b /> : null}</i>
        <div><strong>{STATUS_PEDIDO[chave]}</strong><Sub>{quando}</Sub></div>
      </Passo>;
    })}
  </Tempo>;
}

const SelectCurto = styled.div`&&& { flex: 0 0 13rem; } min-width: 0; ${({ theme }) => theme.media.sm} { &&& { flex: 1 1 100%; } }`;
/** Duas colunas: o pedido à esquerda e, à direita, o andamento, a cliente e a entrega. No celular, uma embaixo da outra. */
const Corpo = styled.div`display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(17rem, 1fr); align-items: start; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0; @media (max-width: 860px) { grid-template-columns: minmax(0, 1fr); }`;
const Principal = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0;`;
const Lateral = styled.aside`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0;`;
const Bolinha = styled("span", transientOptions)<{ $tom: Tone }>`display: block; width: 0.625rem; height: 0.625rem; border-radius: 50%; background: ${({ theme, $tom }) => theme.tones[$tom].fg};`;
/** Cada assunto no seu cartão: borda fina, canto leve e o título em cima. */
const Bloco = styled.section`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0; padding: ${({ theme }) => theme.spacing(4)}; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.palette.neutral[0]};`;
const TituloBloco = styled.h3`display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)}; min-height: 1.5rem; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary};
  > em { margin-right: auto; font-style: normal; padding: 0 ${({ theme }) => theme.spacing(1.5)}; border-radius: 999px; background: ${({ theme }) => theme.palette.neutral[100]}; color: ${({ theme }) => theme.colors.text.secondary}; font-size: 0.6875rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; line-height: 1.25rem; }`;

const Tempo = styled.ol`display: flex; flex-direction: column; list-style: none;`;
const Passo = styled("li", transientOptions)<{ $tom: Tone; $estado: "feito" | "agora" | "falta" }>`
  position: relative; display: grid; grid-template-columns: 1.375rem minmax(0, 1fr); gap: ${({ theme }) => theme.spacing(2.5)}; padding-bottom: ${({ theme }) => theme.spacing(3.5)}; font-size: 0.8125rem; line-height: 1.3;
  &:last-of-type { padding-bottom: 0; }
  /* O fio que liga ao próximo marcador: colorido até a etapa atual */
  &:not(:last-of-type)::before { content: ""; position: absolute; top: 1.5rem; bottom: 2px; left: calc(0.6875rem - 1px); width: 2px; border-radius: 2px;
    background: ${({ theme, $tom, $estado }) => ($estado === "feito" ? theme.tones[$tom].fg : theme.palette.neutral[200])}; }
  > i { display: grid; place-items: center; width: 1.375rem; height: 1.375rem; border-radius: 50%; color: ${({ theme }) => theme.palette.neutral[0]};
    background: ${({ theme, $tom, $estado }) => ($estado === "feito" ? theme.tones[$tom].fg : $estado === "agora" ? theme.tones[$tom].soft : theme.palette.neutral[0])};
    box-shadow: inset 0 0 0 ${({ $estado }) => ($estado === "falta" ? "1.5px" : $estado === "agora" ? "2px" : "0")} ${({ theme, $tom, $estado }) => ($estado === "agora" ? theme.tones[$tom].fg : theme.palette.neutral[300])}; }
  > i b { display: block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: ${({ theme, $tom }) => theme.tones[$tom].fg}; }
  strong { display: block; padding-top: 2px; font-weight: ${({ theme, $estado }) => ($estado === "agora" ? theme.fontWeights.semibold : theme.fontWeights.medium)}; color: ${({ theme, $estado }) => ($estado === "falta" ? theme.colors.text.muted : theme.colors.text.primary)}; }
`;
const Cancelado = styled.p`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(1.5)}; padding: ${({ theme }) => theme.spacing(2, 3)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.tones.rose.bg}; color: ${({ theme }) => theme.tones.rose.fg}; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium};`;

const Itens = styled.ul`display: flex; flex-direction: column; list-style: none; font-size: 0.8125rem;
  > li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(3, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; }
  > li:first-of-type { padding-top: 0; }
  > li:last-of-type { padding-bottom: 0; border-bottom: 0; }
  strong { display: block; font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }`;
/** A foto da peça (ou o ícone, quando não há); a quantidade aparece no canto quando passa de um. */
const Foto = styled.span`position: relative; display: grid; place-items: center; width: 4rem; height: 4.75rem; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; color: ${({ theme }) => theme.colors.text.muted};
  img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
  b { position: absolute; top: -6px; right: -6px; min-width: 1.375rem; padding: 0 5px; border-radius: 999px; background: ${({ theme }) => theme.colors.text.primary}; color: ${({ theme }) => theme.palette.neutral[0]}; font-size: 0.6875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; line-height: 1.375rem; text-align: center; }`;
/** As escolhas da cliente (cor, tamanho, bordado) em etiquetas pequenas. */
const Escolhas = styled.ul`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(1)}; margin-top: ${({ theme }) => theme.spacing(1.5)}; list-style: none;
  li { padding: 1px ${({ theme }) => theme.spacing(2)}; border-radius: ${({ theme }) => theme.radii.sm}; background: ${({ theme }) => theme.palette.neutral[100]}; color: ${({ theme }) => theme.colors.text.secondary}; font-size: 0.75rem; line-height: 1.5; }`;
const Valor = styled.span`flex-shrink: 0; text-align: right; font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; white-space: nowrap; > span { font-weight: ${({ theme }) => theme.fontWeights.regular}; }`;
const Totais = styled.dl`display: grid; grid-template-columns: 1fr auto; gap: ${({ theme }) => theme.spacing(2, 4)}; font-size: 0.8125rem;
  dt { color: ${({ theme }) => theme.colors.text.secondary}; } dd { text-align: right; color: ${({ theme }) => theme.colors.text.primary}; }
  code { padding: 1px 6px; border-radius: ${({ theme }) => theme.radii.sm}; background: ${({ theme }) => theme.palette.neutral[100]}; font-family: ${({ theme }) => theme.fonts.mono}; font-size: 0.75rem; }
  [data-desconto] { color: ${({ theme }) => theme.tones.green.fg}; }
  [data-total] { padding-top: ${({ theme }) => theme.spacing(2.5)}; border-top: 1px solid ${({ theme }) => theme.colors.border.subtle}; font-size: 1rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }`;
/** Linhas com ícone (contato, bebê, lead, entrega). */
const Dados = styled.ul`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; list-style: none; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.primary};
  li { display: flex; align-items: flex-start; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; overflow-wrap: anywhere; }
  li > svg { flex-shrink: 0; margin-top: 2px; color: ${({ theme }) => theme.colors.text.muted}; }
  a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }`;
const Quem = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0; > span { min-width: 0; }`;
const Observacao = styled.p`display: flex; flex-direction: column; gap: 2px; padding: ${({ theme }) => theme.spacing(2.5, 3)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font-size: 0.8125rem; line-height: 1.5; color: ${({ theme }) => theme.colors.text.primary}; overflow-wrap: anywhere;`;
const Mensagem = styled.pre`padding: ${({ theme }) => theme.spacing(3, 4)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font: inherit; font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 20rem; overflow-y: auto; color: ${({ theme }) => theme.colors.text.secondary};`;
