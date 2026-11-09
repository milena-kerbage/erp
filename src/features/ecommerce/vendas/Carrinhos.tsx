"use client";
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CopyIcon, EyeIcon, ShoppingBagIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { copyText } from "@/lib/clipboard";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Notice, Page, PageHeader, Stack, StatCard, StatGrid, Toolbar } from "@/features/operations/components/ui";
import type { CarrinhoAbandonadoGestao, RespostaCarrinhos, RespostaMensagemCarrinho } from "@/features/ecommerce/types";
import {
  AvisoRestrito, dataHora, dinheiro, haTempo, LinkTexto, Nome, parametroDaUrl, plural, Rodape, Sub, CaixaTabela, TabelaResponsiva, TituloSecao, useDadosErp, useRestrito,
} from "./comum";

type Lembrete = "todos" | "sem" | "com";
const PAGINA = 50;
const IDADES = [
  { value: "1", label: "Parados há 1 hora ou mais" },
  { value: "24", label: "Parados há 24 horas ou mais" },
  { value: "72", label: "Parados há 3 dias ou mais" },
  { value: "168", label: "Parados há 7 dias ou mais" },
  { value: "720", label: "Parados há 30 dias ou mais" },
] as const;
type Idade = (typeof IDADES)[number]["value"];
const LEMBRETES: { value: Lembrete; label: string }[] = [
  { value: "todos", label: "Com ou sem lembrete" },
  { value: "sem", label: "Ainda sem lembrete" },
  { value: "com", label: "Lembrete já preparado" },
];

/**
 * Carrinhos abandonados: sacolas de clientes com conta (logadas) que não viraram pedido e estão paradas.
 * A equipe vê as peças e o valor "a partir de" e prepara um lembrete pelo WhatsApp: o ERP só monta a
 * mensagem e o link wa.me; quem envia é a vendedora, no WhatsApp dela. Nada sai automaticamente.
 */
export function CarrinhosEcommerce() {
  const [idade, setIdade] = useState<Idade>("24");
  const [lembrete, setLembrete] = useState<Lembrete>("todos");
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState<CarrinhoAbandonadoGestao | null>(null);
  const [mensagemPara, setMensagemPara] = useState<CarrinhoAbandonadoGestao | null>(null);

  useEffect(() => { const horas = parametroDaUrl("horas"); if (horas && IDADES.some((item) => item.value === horas)) setIdade(horas as Idade); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setTermo(busca.trim()), 300); return () => window.clearTimeout(timer); }, [busca]);
  const caminho = (offset: number) => `loja/carrinhos?horas=${idade}&lembrete=${lembrete}&limit=${PAGINA}&offset=${offset}${termo ? `&busca=${encodeURIComponent(termo)}` : ""}`;
  const { dados, setDados, carregando, setCarregando, erro, setErro, negado, recarregar } = useDadosErp<RespostaCarrinhos>(caminho(0));
  const restrito = useRestrito(negado);

  async function carregarMais() {
    if (!dados) return;
    setCarregando(true);
    try {
      const proxima = await erpRequest<RespostaCarrinhos>(caminho(dados.carrinhos.length));
      setDados({ ...proxima, carrinhos: [...dados.carrinhos, ...proxima.carrinhos.filter((item) => !dados.carrinhos.some((existente) => existente.clienteId === item.clienteId))] });
    } catch (caught) { setErro(requestError(caught)); } finally { setCarregando(false); }
  }

  /** Lembrete preparado: atualiza a linha sem recarregar a lista. */
  function marcarLembrete(clienteId: string, lembreteEm: string) {
    setDados((atual) => atual && { ...atual, carrinhos: atual.carrinhos.map((item) => item.clienteId === clienteId ? { ...item, lembreteEm } : item) });
    setAberto((atual) => atual && atual.clienteId === clienteId ? { ...atual, lembreteEm } : atual);
  }

  const carrinhos = dados?.carrinhos ?? [];
  const semLembrete = carrinhos.filter((item) => !item.lembreteEm).length;
  const filtrado = Boolean(termo) || lembrete !== "todos";

  return <Page>
    <PageHeader title="Carrinhos abandonados" description="Sacolas de clientes com conta que não viraram pedido. Prepare um lembrete e envie pelo seu WhatsApp: nada é enviado automaticamente." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando} onClick={() => void recarregar()}>Atualizar</Button>} />
    {restrito ? <AvisoRestrito area="Os carrinhos abandonados" /> : <>
      {erro && <Notice role="alert">{erro} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
      {dados && <StatGrid>
        <StatCard label="Carrinhos parados" value={dados.pagination.total.toLocaleString("pt-BR")} note={IDADES.find((item) => item.value === idade)?.label ?? ""} icon={ShoppingBagIcon} />
        <StatCard label="Valor “a partir de”" value={dinheiro(dados.totalCentavos)} note="soma das sacolas filtradas" icon={ShoppingBagIcon} />
        <StatCard label="Sem lembrete" value={semLembrete.toLocaleString("pt-BR")} note={dados.pagination.hasMore ? "entre os carrinhos exibidos" : "ainda não chamadas"} icon={WhatsappLogoIcon} />
      </StatGrid>}
      <Card>
        <Toolbar>
          <SearchField label="Buscar carrinhos" placeholder="Nome, e-mail ou WhatsApp" value={busca} onChange={(event) => setBusca(event.target.value)} />
          <Filtro><Select label="Parado há" options={IDADES} value={idade} onChange={setIdade} /></Filtro>
          <Filtro><Select label="Lembrete" options={LEMBRETES} value={lembrete} onChange={setLembrete} /></Filtro>
        </Toolbar>
        {carregando && !dados ? <Empty role="status">Carregando carrinhos…</Empty> : !carrinhos.length ? (erro ? <Empty><strong>A lista não pôde ser carregada.</strong></Empty> :
          <EmptyState icon={<ShoppingBagIcon size={28} />} title={filtrado ? "Nenhum carrinho com estes filtros" : "Nenhum carrinho parado"} description={filtrado ? "Mude a busca ou o filtro de lembrete." : "Quando uma cliente com conta deixa peças na sacola e não envia o pedido, o carrinho aparece aqui depois do tempo escolhido."} />) :
          <CaixaTabela><TabelaResponsiva>
            <thead><tr><th>Cliente</th><th>Peças</th><th>A partir de</th><th>Última mudança</th><th>Lembrete</th><th aria-label="Ações" /></tr></thead>
            <tbody>{carrinhos.map((carrinho) => <tr key={carrinho.clienteId} data-clicavel onClick={() => setAberto(carrinho)}>
              <td data-principal><span><Nome>{carrinho.nome}</Nome><Sub>{carrinho.whatsappFormatado}</Sub></span></td>
              <td data-label="Peças"><span><Nome>{carrinho.quantidade}</Nome><Sub>{resumoItens(carrinho)}</Sub></span></td>
              <td data-label="A partir de"><strong>{dinheiro(carrinho.totalCentavos)}</strong></td>
              <td data-label="Última mudança"><span><Nome>{dataHora(carrinho.atualizadoEm)}</Nome><Sub>{haTempo(carrinho.horasParado)}</Sub></span></td>
              <td data-label="Lembrete">{carrinho.lembreteEm ? dataHora(carrinho.lembreteEm) : <Sub>—</Sub>}</td>
              <td data-acoes><Actions>
                <Button size="sm" variant="ghost" icon={EyeIcon} onClick={(event) => { event.stopPropagation(); setAberto(carrinho); }}>Ver</Button>
                <Button size="sm" variant="secondary" icon={WhatsappLogoIcon} onClick={(event) => { event.stopPropagation(); setMensagemPara(carrinho); }}>Chamar</Button>
              </Actions></td>
            </tr>)}</tbody>
          </TabelaResponsiva></CaixaTabela>}
        <Rodape>{plural(carrinhos.length, "carrinho exibido", "carrinhos exibidos")}{dados && dados.pagination.total > carrinhos.length ? ` de ${dados.pagination.total}` : ""}. Só aparecem clientes que entraram com a conta (a sacola de visitante fica no aparelho).</Rodape>
      </Card>
      {dados?.pagination.hasMore && <Button variant="secondary" loading={carregando} onClick={() => void carregarMais()}>Carregar mais</Button>}
    </>}

    <Dialog open={Boolean(aberto)} onClose={() => setAberto(null)} width="40rem" title={aberto ? `Sacola de ${aberto.nome}` : "Sacola"} description={aberto ? `${plural(aberto.quantidade, "peça", "peças")} · a partir de ${dinheiro(aberto.totalCentavos)} · parada ${haTempo(aberto.horasParado)}` : undefined}
      footer={<Actions>{aberto && <Button icon={WhatsappLogoIcon} onClick={() => setMensagemPara(aberto)}>Chamar no WhatsApp</Button>}<Button variant="ghost" onClick={() => setAberto(null)}>Fechar</Button></Actions>}>
      {aberto && <Stack>
        <ItensCarrinho carrinho={aberto} />
        <Sub>Criada em {dataHora(aberto.criadoEm)} · última mudança em {dataHora(aberto.atualizadoEm)}{aberto.lembreteEm ? ` · lembrete preparado em ${dataHora(aberto.lembreteEm)}` : ""}</Sub>
        <Sub><LinkTexto href={`/ecommerce/clientes?cliente=${encodeURIComponent(aberto.clienteId)}`}>Ver a cliente</LinkTexto> · {aberto.email}</Sub>
      </Stack>}
    </Dialog>
    <PrepararMensagemCarrinho clienteId={mensagemPara?.clienteId ?? null} nome={mensagemPara?.nome ?? ""} onFechar={(lembreteEm) => { if (mensagemPara && lembreteEm) marcarLembrete(mensagemPara.clienteId, lembreteEm); setMensagemPara(null); }} />
  </Page>;
}

const resumoItens = (carrinho: CarrinhoAbandonadoGestao) => {
  const nomes = carrinho.itens.map((item) => item.nome);
  return nomes.length > 2 ? `${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}` : nomes.join(", ");
};

function ItensCarrinho({ carrinho }: { carrinho: CarrinhoAbandonadoGestao }) {
  return <Itens>{carrinho.itens.map((item, indice) => <li key={`${item.nome}-${indice}`}>
    <div><strong>{item.quantidade}× {item.nome}</strong>{!item.disponivel && <Sub>Indisponível no catálogo agora (fica fora da mensagem)</Sub>}{item.detalhes.length > 0 && <Sub>{item.detalhes.join(" · ")}</Sub>}</div>
    <span>{item.disponivel ? dinheiro(item.precoCentavos * item.quantidade) : "—"}</span>
  </li>)}</Itens>;
}

/**
 * Prepara o lembrete do carrinho: a rota monta a mensagem e o link wa.me e registra "lembrete em".
 * A janela mostra o texto; a vendedora abre o WhatsApp e envia (nada é enviado daqui).
 */
export function PrepararMensagemCarrinho({ clienteId, nome, onFechar }: { clienteId: string | null; nome: string; onFechar: (lembreteEm: string | null) => void }) {
  const [resposta, setResposta] = useState<RespostaMensagemCarrinho | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  // Uma preparação por abertura (o modo estrito do React roda o efeito duas vezes em desenvolvimento).
  const emAndamento = useRef<{ clienteId: string; promessa: Promise<RespostaMensagemCarrinho> } | null>(null);

  useEffect(() => {
    setResposta(null); setErro(""); setCopiado(false);
    if (!clienteId) { emAndamento.current = null; return; }
    let ativo = true;
    if (emAndamento.current?.clienteId !== clienteId) emAndamento.current = { clienteId, promessa: erpRequest<RespostaMensagemCarrinho>(`loja/carrinhos/${encodeURIComponent(clienteId)}/mensagem`, { method: "POST", body: {} }) };
    emAndamento.current.promessa
      .then((dados) => { if (ativo) setResposta(dados); }).catch((caught) => { if (ativo) setErro(requestError(caught)); });
    return () => { ativo = false; };
  }, [clienteId]);

  const fechar = () => onFechar(resposta?.lembreteEm ?? null);
  return <Dialog open={Boolean(clienteId)} onClose={fechar} width="34rem" title={`Lembrete para ${nome.split(" ")[0] || "a cliente"}`} description="Confira a mensagem e envie pelo seu WhatsApp. Nada é enviado automaticamente."
    footer={<Actions>
      {resposta && <Button variant="secondary" icon={CopyIcon} onClick={async () => setCopiado(await copyText(resposta.mensagem))}>{copiado ? "Copiada" : "Copiar mensagem"}</Button>}
      {resposta && <Button icon={WhatsappLogoIcon} href={resposta.link} target="_blank" rel="noopener noreferrer" onClick={fechar}>Abrir no WhatsApp</Button>}
      <Button variant="ghost" onClick={fechar}>Fechar</Button>
    </Actions>}>
    {erro ? <Notice role="alert">{erro}</Notice> : !resposta ? <Empty role="status">Preparando a mensagem…</Empty> : <Stack>
      <TituloSecao>Mensagem</TituloSecao>
      <Mensagem>{resposta.mensagem}</Mensagem>
      <Sub>Lembrete registrado em {dataHora(resposta.lembreteEm)}. O link abre o WhatsApp com o texto pronto; você revisa e envia.</Sub>
    </Stack>}
  </Dialog>;
}

const Filtro = styled.div`&&& { flex: 0 0 15rem; } min-width: 0; ${({ theme }) => theme.media.sm} { &&& { flex: 1 1 100%; } }`;
const Itens = styled.ul`display: flex; flex-direction: column; list-style: none; font-size: 0.8125rem; > li { display: flex; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(2.5, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; } > li > div { min-width: 0; } > li > span { flex-shrink: 0; white-space: nowrap; } strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }`;
const Mensagem = styled.pre`padding: ${({ theme }) => theme.spacing(3, 4)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font: inherit; font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 18rem; overflow-y: auto; color: ${({ theme }) => theme.colors.text.secondary};`;
