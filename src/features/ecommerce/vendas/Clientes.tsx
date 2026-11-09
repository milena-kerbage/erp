"use client";
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CopyIcon, EyeIcon, KeyIcon, ShoppingBagIcon, UserFocusIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SearchField } from "@/components/ui/SearchField";
import { Tag } from "@/components/ui/Tag";
import { copyText } from "@/lib/clipboard";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Notice, Page, PageHeader, Pill, Stack, Toolbar } from "@/features/operations/components/ui";
import { COMO_CONHECEU, TIPO_DATA_BEBE } from "@/loja/lib/contas/regras";
import {
  AvisoRestrito, data, dataHora, dinheiro, EtapaPill, Fatos, haTempo, limparParametro, Linha, LinkTexto, Nome, parametroDaUrl, plural, Quem, Rodape, Sub, CaixaTabela, TabelaResponsiva,
  TituloSecao, useDadosErp, useRestrito, whatsappHref, type ClienteLoja, type DetalheCliente,
} from "./comum";
import { PrepararMensagemCarrinho } from "./Carrinhos";

type Resposta = { clientes: ClienteLoja[]; pagination: { total: number; hasMore: boolean } };
type LinkRedefinicao = { link: string; expiraEm: string };
const PAGINA = 25;

/**
 * Clientes com conta na loja (cadastro no site). Cada conta vira lead no CRM (origem "Loja online").
 * A equipe consulta os dados, os pedidos, a sacola aberta e o cupom de primeira compra; quando a cliente
 * esquece a senha (não há e-mail configurado), gera um link de redefinição que aparece UMA vez.
 */
export function ClientesEcommerce() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [abertaId, setAbertaId] = useState<string | null>(null);

  useEffect(() => { const id = parametroDaUrl("cliente"); if (id) setAbertaId(id); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setTermo(busca.trim()), 300); return () => window.clearTimeout(timer); }, [busca]);
  const caminho = (offset: number) => `loja/clientes?limit=${PAGINA}&offset=${offset}${termo ? `&busca=${encodeURIComponent(termo)}` : ""}`;
  const { dados, setDados, carregando, setCarregando, erro, setErro, negado, recarregar } = useDadosErp<Resposta>(caminho(0));
  const restrito = useRestrito(negado);

  async function carregarMais() {
    if (!dados) return;
    setCarregando(true);
    try {
      const proxima = await erpRequest<Resposta>(caminho(dados.clientes.length));
      setDados({ ...proxima, clientes: [...dados.clientes, ...proxima.clientes.filter((item) => !dados.clientes.some((existente) => existente.id === item.id))] });
    } catch (caught) { setErro(requestError(caught)); } finally { setCarregando(false); }
  }

  const clientes = dados?.clientes ?? [];
  return <Page>
    <PageHeader title="Clientes da loja" description="Contas criadas no site da loja. Cada conta vira lead no CRM (origem “Loja online”); os pedidos seguem pelo WhatsApp." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando} onClick={() => void recarregar()}>Atualizar</Button>} />
    {restrito ? <AvisoRestrito area="As contas de clientes da loja" /> : <>
      {erro && <Notice role="alert">{erro} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
      <Card>
        <Toolbar><SearchField label="Buscar clientes da loja" placeholder="Nome, e-mail ou WhatsApp" value={busca} onChange={(event) => setBusca(event.target.value)} /></Toolbar>
        {carregando && !dados ? <Empty role="status">Carregando clientes…</Empty> : !clientes.length ? <Empty><strong>{erro ? "A lista não pôde ser carregada." : termo ? "Nenhuma cliente encontrada." : "Nenhuma conta criada na loja ainda."}</strong><span>As contas são criadas no site, no cadastro rápido do pedido ou em Minha conta.</span></Empty> :
          <CaixaTabela><TabelaResponsiva>
            <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Pedidos</th><th>Último pedido</th><th>Lead no CRM</th><th>Cupom 5%</th><th aria-label="Ações" /></tr></thead>
            <tbody>{clientes.map((cliente) => <tr key={cliente.id} data-clicavel onClick={() => setAbertaId(cliente.id)}>
              <td data-principal><Quem><Avatar name={cliente.nome} src={cliente.avatar} seed={cliente.id} size="sm" shape="circle" /><span><Nome>{cliente.nome}</Nome><Sub>{cliente.email}</Sub></span></Quem></td>
              <td data-label="WhatsApp">{cliente.whatsappFormatado}</td>
              <td data-label="Pedidos">{cliente.pedidos}</td>
              <td data-label="Último pedido">{cliente.ultimoPedidoEm ? data(cliente.ultimoPedidoEm) : "—"}</td>
              <td data-label="Lead no CRM">{cliente.lead ? <LinkTexto href={cliente.lead.href} onClick={(event) => event.stopPropagation()}>{cliente.lead.etapa}</LinkTexto> : <Sub>—</Sub>}</td>
              <td data-label="Cupom 5%">{cliente.cupom ? <Pill $tone={cliente.cupom.usado ? "neutral" : "green"}>{cliente.cupom.usado ? "Usado" : "Disponível"}</Pill> : "—"}</td>
              <td data-acoes><Button size="sm" variant="ghost" icon={EyeIcon} onClick={(event) => { event.stopPropagation(); setAbertaId(cliente.id); }}>Ver</Button></td>
            </tr>)}</tbody>
          </TabelaResponsiva></CaixaTabela>}
        <Rodape>{plural(clientes.length, "cliente exibida", "clientes exibidas")}{dados && dados.pagination.total > clientes.length ? ` de ${dados.pagination.total}` : ""}. Cadastro em {clientes.length ? "ordem do mais recente" : "—"}.</Rodape>
      </Card>
      {dados?.pagination.hasMore && <Button variant="secondary" loading={carregando} onClick={() => void carregarMais()}>Carregar mais</Button>}
      <Notice>Esqueceu a senha? A loja não envia e-mail: abra a cliente, gere o link de redefinição e mande pelo WhatsApp. O link vale por 2 horas, funciona uma vez e aparece só agora (não fica guardado).</Notice>
    </>}
    <DetalheClienteDialog id={abertaId} onFechar={() => { setAbertaId(null); limparParametro("cliente"); }} onErro={setErro} />
  </Page>;
}

function DetalheClienteDialog({ id, onFechar, onErro }: { id: string | null; onFechar: () => void; onErro: (mensagem: string) => void }) {
  const [detalhe, setDetalhe] = useState<DetalheCliente | null>(null);
  const [erro, setErro] = useState("");
  const [redefinicao, setRedefinicao] = useState<LinkRedefinicao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [lembrete, setLembrete] = useState(false);

  useEffect(() => {
    setDetalhe(null); setErro(""); setRedefinicao(null); setCopiado(false); setLembrete(false);
    if (!id) return;
    const controller = new AbortController();
    erpRequest<DetalheCliente>(`loja/clientes/${encodeURIComponent(id)}`, { signal: controller.signal }).then(setDetalhe).catch((caught) => { if (!controller.signal.aborted) { onErro(requestError(caught)); onFechar(); } });
    return () => controller.abort();
    // onErro/onFechar mudam a cada render da página; o detalhe só recarrega com outro id.
  }, [id]);

  async function gerar() {
    if (!detalhe) return;
    setOcupado(true); setErro(""); setCopiado(false);
    try { setRedefinicao(await erpRequest<LinkRedefinicao>(`loja/clientes/${encodeURIComponent(detalhe.cliente.id)}/redefinicao`, { method: "POST", body: {} })); }
    catch (caught) { setErro(requestError(caught)); } finally { setOcupado(false); }
  }

  const cliente = detalhe?.cliente;
  const perfil = cliente?.perfil;
  const mensagemRedefinicao = cliente && redefinicao ? `Olá, ${cliente.nome.split(" ")[0]}! Aqui é do Ateliê Milena Kerbage. Para criar uma nova senha da sua conta na loja, abra este link (vale por 2 horas e só uma vez):\n${redefinicao.link}` : "";
  const fechar = () => { if (!ocupado) onFechar(); };

  return <Dialog open={Boolean(id)} onClose={fechar} width="44rem" title={cliente?.nome ?? "Cliente"} description={cliente ? `Conta criada em ${dataHora(cliente.criadaEm)}` : "Carregando…"}
    footer={<Actions>{cliente && <Button variant="secondary" icon={WhatsappLogoIcon} href={whatsappHref(cliente.whatsapp)} target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</Button>}<Button variant="ghost" disabled={ocupado} onClick={fechar}>Fechar</Button></Actions>}>
    {!detalhe || !cliente || !perfil ? <Empty role="status">Carregando cliente…</Empty> : <Stack>
      <Quem><Avatar name={cliente.nome} src={cliente.avatar} seed={cliente.id} size="lg" shape="circle" /><span><Nome>{cliente.nome}</Nome><Sub>Cliente da loja online · {plural(detalhe.pedidos.length, "pedido", "pedidos")}{cliente.status === "bloqueada" ? " · conta bloqueada" : ""}</Sub></span></Quem>
      <Fatos>
        <dt>E-mail</dt><dd>{cliente.email}</dd>
        <dt>WhatsApp</dt><dd><a href={whatsappHref(cliente.whatsapp)} target="_blank" rel="noopener noreferrer">{cliente.whatsappFormatado}</a></dd>
        <dt>Último acesso</dt><dd>{cliente.ultimoAcesso ? dataHora(cliente.ultimoAcesso) : "—"}</dd>
        <dt>Termos aceitos</dt><dd>versão {cliente.termosVersao}, em {dataHora(cliente.termosAceitosEm)}</dd>
        {perfil.cpf && <><dt>CPF</dt><dd>{perfil.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</dd></>}
        {(perfil.endereco || perfil.cidade) && <><dt>Endereço</dt><dd>{[perfil.endereco, [perfil.cidade, perfil.uf].filter(Boolean).join("/"), perfil.cep && `CEP ${perfil.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`].filter(Boolean).join(" · ")}</dd></>}
        {perfil.bebeData && <><dt>{TIPO_DATA_BEBE[perfil.bebeDataTipo as keyof typeof TIPO_DATA_BEBE] ?? "Data do bebê"}</dt><dd>{perfil.bebeData.split("-").reverse().join("/")}</dd></>}
        {perfil.bebeNome && <><dt>Nome do bebê</dt><dd>{perfil.bebeNome}</dd></>}
        {perfil.comoConheceu && <><dt>Como conheceu</dt><dd>{COMO_CONHECEU[perfil.comoConheceu as keyof typeof COMO_CONHECEU] ?? perfil.comoConheceu}</dd></>}
        {perfil.preferencias && <><dt>Preferências</dt><dd>{perfil.preferencias}</dd></>}
        {detalhe.cliente.faltando.length > 0 && <><dt>Dados opcionais</dt><dd><Sub>{plural(detalhe.cliente.faltando.length, "campo opcional ainda vazio", "campos opcionais ainda vazios")} (a cliente completa em Minha conta)</Sub></dd></>}
      </Fatos>

      <section aria-label="Lead no CRM">
        <TituloSecao>Lead no CRM</TituloSecao>
        {detalhe.lead ? <Linha><span><Nome>{detalhe.lead.nome}</Nome><Sub>{detalhe.lead.funil} · {detalhe.lead.etapa}</Sub></span><Button size="sm" variant="secondary" icon={UserFocusIcon} href={detalhe.lead.href}>Abrir lead</Button></Linha>
          : <Sub>Ainda sem lead vinculado. O vínculo é feito no cadastro e refeito no próximo pedido (pelo e-mail ou WhatsApp).</Sub>}
      </section>

      <section aria-label="Cupom de primeira compra">
        <TituloSecao>Cupom de primeira compra</TituloSecao>
        {detalhe.cupom ? <Linha><Tag tone={detalhe.cupom.usado ? "neutral" : "green"}>{detalhe.cupom.codigo}</Tag><Sub>{detalhe.cupom.percentual}% OFF · {detalhe.cupom.usado ? <>usado{detalhe.cupom.pedido && <> no pedido <LinkTexto href={`/ecommerce/pedidos?pedido=${encodeURIComponent(detalhe.cupom.pedido)}`}>{detalhe.cupom.pedido}</LinkTexto></>}{detalhe.cupom.usadoEm && ` em ${data(detalhe.cupom.usadoEm)}`}</> : "disponível"}</Sub></Linha> : <Sub>—</Sub>}
      </section>

      <section aria-label="Sacola aberta">
        <TituloSecao>Sacola aberta</TituloSecao>
        {detalhe.carrinho ? <Stack>
          <Sub>{plural(detalhe.carrinho.quantidade, "peça", "peças")} · a partir de {dinheiro(detalhe.carrinho.totalCentavos)} · mexida {haTempo(detalhe.carrinho.horasParado)}{detalhe.carrinho.lembreteEm ? ` · lembrete preparado em ${dataHora(detalhe.carrinho.lembreteEm)}` : ""}</Sub>
          <Lista>{detalhe.carrinho.itens.map((item, indice) => <li key={`${item.nome}-${indice}`}><span>{item.quantidade}× {item.nome}{!item.disponivel && " (indisponível)"}{item.detalhes.length > 0 && <Sub>{item.detalhes.join(" · ")}</Sub>}</span><span>{dinheiro(item.precoCentavos * item.quantidade)}</span></li>)}</Lista>
          <div><Button size="sm" variant="secondary" icon={ShoppingBagIcon} onClick={() => setLembrete(true)}>Chamar no WhatsApp</Button></div>
        </Stack> : <Sub>Nenhuma peça na sacola (ou a cliente ainda não entrou com a conta neste aparelho).</Sub>}
      </section>

      <section aria-label="Pedidos da cliente">
        <TituloSecao>Pedidos ({detalhe.pedidos.length})</TituloSecao>
        {detalhe.pedidos.length ? <Lista>{detalhe.pedidos.map((pedido) => <li key={pedido.numero}><span><LinkTexto href={`/ecommerce/pedidos?pedido=${encodeURIComponent(pedido.numero)}`}>{pedido.numero}</LinkTexto><Sub>{dataHora(pedido.criadoEm)} · a partir de {dinheiro(pedido.totalCentavos)}{pedido.cupom ? ` · ${pedido.cupom.codigo}` : ""}</Sub></span><EtapaPill status={pedido.status} curta /></li>)}</Lista> : <Sub>Nenhum pedido ainda.</Sub>}
      </section>

      <section aria-label="Redefinição de senha">
        <TituloSecao>Senha</TituloSecao>
        {detalhe.redefinicao && !redefinicao && <Sub>Último link gerado em {dataHora(detalhe.redefinicao.criadaEm)} · {detalhe.redefinicao.usadaEm ? `usado em ${dataHora(detalhe.redefinicao.usadaEm)}` : new Date(detalhe.redefinicao.expiraEm) < new Date() ? "expirado" : `vale até ${dataHora(detalhe.redefinicao.expiraEm)}`}</Sub>}
        {redefinicao ? <Stack>
          <Notice role="status">Link gerado. Ele aparece só agora: copie e envie pelo WhatsApp da cliente. Vale até {dataHora(redefinicao.expiraEm)} e funciona uma vez; gerar outro invalida este.</Notice>
          <CaixaLink aria-label="Link de redefinição">{redefinicao.link}</CaixaLink>
          <Actions>
            <Button size="sm" icon={CopyIcon} onClick={async () => setCopiado(await copyText(redefinicao.link))}>{copiado ? "Copiado" : "Copiar link"}</Button>
            <Button size="sm" variant="secondary" icon={WhatsappLogoIcon} href={whatsappHref(cliente.whatsapp, mensagemRedefinicao)} target="_blank" rel="noopener noreferrer">Abrir conversa com a mensagem</Button>
          </Actions>
        </Stack> : <div><Button size="sm" variant="secondary" icon={KeyIcon} loading={ocupado} onClick={() => void gerar()}>Gerar link de redefinição de senha</Button></div>}
        {erro && <Notice role="alert">{erro}</Notice>}
      </section>
    </Stack>}
    {detalhe?.carrinho && <PrepararMensagemCarrinho clienteId={lembrete ? detalhe.cliente.id : null} nome={detalhe.cliente.nome} onFechar={(lembreteEm) => { setLembrete(false); if (lembreteEm) setDetalhe((atual) => atual && atual.carrinho ? { ...atual, carrinho: { ...atual.carrinho, lembreteEm } } : atual); }} />}
  </Dialog>;
}

const Lista = styled.ul`display: flex; flex-direction: column; list-style: none; font-size: 0.8125rem; > li { display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(2, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; } > li:last-of-type { border-bottom: 0; } > li > span:first-of-type { min-width: 0; } > li > span:last-of-type { flex-shrink: 0; }`;
const CaixaLink = styled.code`display: block; padding: ${({ theme }) => theme.spacing(3)}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font-size: 0.75rem; overflow-wrap: anywhere; user-select: all;`;
