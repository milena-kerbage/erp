"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, ArrowsClockwiseIcon, LockSimpleIcon, PencilSimpleIcon, PlusIcon, ReceiptIcon, TicketIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { Tag } from "@/components/ui/Tag";
import { TextField } from "@/components/ui/TextField";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, FieldGrid, Form, Notice, Page, PageHeader, Pill, Stack, Toolbar } from "@/features/operations/components/ui";
import type { CupomGestao, EntradaCupom, RespostaCupons, RespostaUsosCupom, SituacaoCupom, TipoCupom } from "@/features/ecommerce/types";
import type { Tone } from "@/styles/theme";
import {
  AvisoRestrito, data, dataHora, diaIso, dinheiro, limparParametro, Linha, LinkTexto, Nome, parametroDaUrl, plural, Rodape, Sub, CaixaTabela, TabelaResponsiva, TituloSecao, useDadosErp, useRestrito,
} from "./comum";

type Filtro = SituacaoCupom | "todos";
const SITUACAO: Record<SituacaoCupom, { rotulo: string; tom: Tone }> = {
  ativo: { rotulo: "Ativo", tom: "green" },
  agendado: { rotulo: "Agendado", tom: "blue" },
  expirado: { rotulo: "Expirado", tom: "neutral" },
  esgotado: { rotulo: "Esgotado", tom: "peach" },
  inativo: { rotulo: "Inativo", tom: "neutral" },
};
const TIPOS: { value: TipoCupom; label: string; description: string }[] = [
  { value: "percentual", label: "Percentual (%)", description: "De 1% a 50% do subtotal" },
  { value: "valor", label: "Valor fixo (R$)", description: "Desconto em reais" },
];

/** "30,00" ou "30" → 3000 centavos; vazio ou inválido → null. */
function centavosDe(texto: string): number | null {
  const limpo = texto.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) : null;
}
const reaisDe = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inteiroOuNulo = (texto: string) => (texto.trim() ? Number(texto.trim()) : null);
const valorDoCupom = (cupom: Pick<CupomGestao, "tipo" | "valor">) => (cupom.tipo === "percentual" ? `${cupom.valor}% OFF` : `${dinheiro(cupom.valor)} OFF`);

/** Código novo e legível (sem 0/O nem 1/I), fora dos reservados ao cupom de primeira compra. */
function gerarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const aleatorio = new Uint32Array(5);
  crypto.getRandomValues(aleatorio);
  return `MIMO-${Array.from(aleatorio, (numero) => letras[numero % letras.length]).join("")}`;
}

/** Validade em texto: "até 31/12", "de 01/12 a 31/12", "sem prazo". O fim gravado é o início do dia seguinte. */
function validade(cupom: Pick<CupomGestao, "inicio" | "fim">) {
  const fim = cupom.fim ? data(new Date(new Date(cupom.fim).getTime() - 1).toISOString()) : null;
  const inicio = cupom.inicio ? data(cupom.inicio) : null;
  if (inicio && fim) return `${inicio} a ${fim}`;
  if (fim) return `até ${fim}`;
  if (inicio) return `a partir de ${inicio}`;
  return "sem prazo";
}

type Formulario = {
  codigo: string; descricao: string; tipo: TipoCupom; valor: string; minimo: string; inicio: string; fim: string;
  limiteTotal: string; limitePorCliente: string; primeiraCompra: boolean; exibir: boolean; ativo: boolean;
};
const VAZIO: Formulario = { codigo: "", descricao: "", tipo: "percentual", valor: "10", minimo: "", inicio: "", fim: "", limiteTotal: "", limitePorCliente: "1", primeiraCompra: false, exibir: false, ativo: true };
function formularioDe(cupom: CupomGestao): Formulario {
  return {
    codigo: cupom.codigo, descricao: cupom.descricao, tipo: cupom.tipo, valor: cupom.tipo === "percentual" ? String(cupom.valor) : reaisDe(cupom.valor), minimo: cupom.minimoCentavos ? reaisDe(cupom.minimoCentavos) : "",
    inicio: cupom.inicio ? diaIso(cupom.inicio) : "", fim: cupom.fim ? diaIso(new Date(new Date(cupom.fim).getTime() - 1)) : "",
    limiteTotal: cupom.limiteTotal === null ? "" : String(cupom.limiteTotal), limitePorCliente: cupom.limitePorCliente === null ? "" : String(cupom.limitePorCliente),
    primeiraCompra: cupom.primeiraCompra, exibir: cupom.exibir, ativo: cupom.ativo,
  };
}

/**
 * Cupons de campanha da loja (ENXOVAL10…): um por pedido, conferido no servidor ao criar o pedido (validade,
 * mínimo, limites e "só primeira compra"). O cupom automático de 5% da primeira compra (BEMVINDA-… de cada
 * conta e BEMVINDO5) é reservado e só aparece aqui para consulta.
 */
export function CuponsEcommerce() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<CupomGestao | "novo" | null>(null);
  const [usosDe, setUsosDe] = useState<CupomGestao | null>(null);
  const [aviso, setAviso] = useState("");
  const [alternando, setAlternando] = useState("");
  const { dados, setDados, carregando, erro, setErro, negado, recarregar } = useDadosErp<RespostaCupons>("loja/cupons");
  const restrito = useRestrito(negado);

  useEffect(() => { if (parametroDaUrl("novo")) setEditando("novo"); }, []);

  const cupons = dados?.cupons ?? [];
  const termo = busca.trim().toLowerCase();
  const visiveis = cupons.filter((cupom) => (filtro === "todos" || cupom.situacao === filtro) && (!termo || cupom.codigo.toLowerCase().includes(termo) || cupom.descricao.toLowerCase().includes(termo)));
  const abas = useMemo(() => [
    { value: "todos" as const, label: "Todos", count: cupons.length },
    ...(Object.keys(SITUACAO) as SituacaoCupom[]).map((chave) => ({ value: chave, label: `${SITUACAO[chave].rotulo}s`, count: cupons.filter((cupom) => cupom.situacao === chave).length })),
  ], [cupons]);

  function salvo(cupom: CupomGestao, mensagem: string) {
    setDados((atual) => atual && { ...atual, cupons: atual.cupons.some((item) => item.id === cupom.id) ? atual.cupons.map((item) => (item.id === cupom.id ? cupom : item)) : [cupom, ...atual.cupons] });
    setAviso(mensagem);
  }
  async function alternar(cupom: CupomGestao, ativo: boolean) {
    setAlternando(cupom.id); setErro(""); setAviso("");
    try { const { cupom: novo } = await erpRequest<{ cupom: CupomGestao }>(`loja/cupons/${encodeURIComponent(cupom.id)}`, { method: "PATCH", body: { revisao: cupom.revisao, ativo } }); salvo(novo, `${novo.codigo} ${ativo ? "ativado" : "desativado"}.`); }
    catch (caught) { setErro(requestError(caught)); } finally { setAlternando(""); }
  }

  return <Page>
    <PageHeader title="Cupons" description="Cupons de campanha da loja: um por pedido, conferidos no servidor. O valor segue “a partir de” e o desconto entra na mensagem do WhatsApp." actions={<Linha>
      <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando} onClick={() => void recarregar()}>Atualizar</Button>
      {!restrito && <Button icon={PlusIcon} onClick={() => setEditando("novo")}>Novo cupom</Button>}
    </Linha>} />
    {restrito ? <AvisoRestrito area="Os cupons da loja" /> : <>
      {erro && <Notice role="alert">{erro} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
      {aviso && <Notice role="status">{aviso}</Notice>}
      {dados && <Reservado aria-label="Cupom de primeira compra (reservado)">
        <IconeReservado aria-hidden><LockSimpleIcon size={18} /></IconeReservado>
        <div>
          <Linha><Nome>Primeira compra · {dados.primeiraCompra.percentual}% OFF</Nome><Tag tone="lavender">Automático</Tag><Tag>Somente leitura</Tag></Linha>
          <Sub>Cada conta nova ganha um código próprio ({dados.primeiraCompra.prefixo}XXXX), e o {dados.primeiraCompra.generico} vale para quem tem conta e ainda não comprou. Os códigos {dados.primeiraCompra.prefixo}… e {dados.primeiraCompra.generico} são reservados: não dá para criar nem editar por aqui.</Sub>
          <Numeros>
            <span><strong>{dados.primeiraCompra.emitidos.toLocaleString("pt-BR")}</strong> emitidos</span>
            <span><strong>{dados.primeiraCompra.usados.toLocaleString("pt-BR")}</strong> usados</span>
            <span><strong>{dinheiro(dados.primeiraCompra.descontoCentavos)}</strong> em desconto “a partir de”</span>
          </Numeros>
        </div>
      </Reservado>}
      <Card>
        <Toolbar><SearchField label="Buscar cupons" placeholder="Código ou descrição" value={busca} onChange={(event) => setBusca(event.target.value)} /></Toolbar>
        <Tabs items={abas} value={filtro} onChange={setFiltro} label="Situação dos cupons">
          {carregando && !dados ? <Empty role="status">Carregando cupons…</Empty> : !cupons.length ? (erro ? <Empty><strong>A lista não pôde ser carregada.</strong></Empty> :
            <EmptyState icon={<TicketIcon size={28} />} title="Nenhum cupom de campanha" description="Crie um cupom para uma campanha (ex.: ENXOVAL10). Sem nenhum cadastrado, a loja usa os cupons padrão do código."><Button icon={PlusIcon} onClick={() => setEditando("novo")}>Novo cupom</Button></EmptyState>) :
            !visiveis.length ? <Empty><strong>Nenhum cupom neste filtro.</strong></Empty> :
            <CaixaTabela><TabelaResponsiva>
              <thead><tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Validade</th><th>Usos</th><th>Situação</th><th>Ativo</th><th aria-label="Ações" /></tr></thead>
              <tbody>{visiveis.map((cupom) => <tr key={cupom.id}>
                <td data-principal><span><Nome>{cupom.codigo}</Nome>{cupom.descricao && <Sub>{cupom.descricao}</Sub>}</span></td>
                <td data-label="Desconto"><span><Nome>{valorDoCupom(cupom)}</Nome><Sub>{cupom.tipo === "percentual" ? "percentual" : "valor fixo"}{cupom.primeiraCompra ? " · 1ª compra" : ""}{cupom.exibir ? " · na sacola" : ""}</Sub></span></td>
                <td data-label="Mínimo">{cupom.minimoCentavos ? dinheiro(cupom.minimoCentavos) : "—"}</td>
                <td data-label="Validade">{validade(cupom)}</td>
                <td data-label="Usos"><span><Nome>{cupom.usos}{cupom.limiteTotal !== null ? ` / ${cupom.limiteTotal}` : ""}</Nome>{cupom.limitePorCliente !== null && <Sub>{cupom.limitePorCliente} por cliente</Sub>}</span></td>
                <td data-label="Situação"><Pill $tone={SITUACAO[cupom.situacao].tom}>{SITUACAO[cupom.situacao].rotulo}</Pill></td>
                <td data-label="Ativo"><Switch checked={cupom.ativo} disabled={alternando === cupom.id} label={`${cupom.ativo ? "Desativar" : "Ativar"} ${cupom.codigo}`} onChange={(ativo) => void alternar(cupom, ativo)} /></td>
                <td data-acoes><Actions>
                  <Button size="sm" variant="ghost" icon={ReceiptIcon} onClick={() => setUsosDe(cupom)}>Usos</Button>
                  <Button size="sm" variant="ghost" icon={PencilSimpleIcon} onClick={() => setEditando(cupom)}>Editar</Button>
                </Actions></td>
              </tr>)}</tbody>
            </TabelaResponsiva></CaixaTabela>}
        </Tabs>
        <Rodape>{plural(visiveis.length, "cupom exibido", "cupons exibidos")}{visiveis.length !== cupons.length ? ` de ${cupons.length}` : ""}. Inativo, agendado, expirado ou esgotado não vale na sacola.</Rodape>
      </Card>
    </>}
    <FormularioCupom alvo={editando} onFechar={() => { setEditando(null); limparParametro("novo"); }} onSalvo={(cupom, novo) => { salvo(cupom, novo ? `Cupom ${cupom.codigo} criado.` : `Cupom ${cupom.codigo} salvo.`); setEditando(null); limparParametro("novo"); }} />
    <UsosCupom cupom={usosDe} onFechar={() => setUsosDe(null)} />
  </Page>;
}

function FormularioCupom({ alvo, onFechar, onSalvo }: { alvo: CupomGestao | "novo" | null; onFechar: () => void; onSalvo: (cupom: CupomGestao, novo: boolean) => void }) {
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const existente = alvo && alvo !== "novo" ? alvo : null;

  useEffect(() => {
    if (!alvo) return;
    setErro("");
    setForm(alvo === "novo" ? { ...VAZIO, codigo: gerarCodigo() } : formularioDe(alvo));
  }, [alvo]);
  const campo = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => setForm((atual) => ({ ...atual, [chave]: valor }));

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const valor = form.tipo === "percentual" ? Number(form.valor.trim()) : centavosDe(form.valor);
    if (!valor || !Number.isInteger(valor) || (form.tipo === "percentual" && (valor < 1 || valor > 50))) { setErro(form.tipo === "percentual" ? "Informe o percentual, de 1 a 50." : "Informe o valor do desconto em reais (ex.: 30,00)."); return; }
    const minimo = form.minimo.trim() ? centavosDe(form.minimo) : 0;
    if (minimo === null) { setErro("Valor mínimo do pedido inválido (ex.: 300,00)."); return; }
    if (form.inicio && form.fim && form.fim < form.inicio) { setErro("O fim da validade deve ser depois do início."); return; }
    const corpo: EntradaCupom = {
      codigo: form.codigo.trim().toUpperCase(), descricao: form.descricao.trim(), tipo: form.tipo, valor, minimoCentavos: minimo,
      inicio: form.inicio || null, fim: form.fim || null, limiteTotal: inteiroOuNulo(form.limiteTotal), limitePorCliente: inteiroOuNulo(form.limitePorCliente),
      primeiraCompra: form.primeiraCompra, exibir: form.exibir, ativo: form.ativo,
    };
    setSalvando(true); setErro("");
    try {
      const { cupom } = existente
        ? await erpRequest<{ cupom: CupomGestao }>(`loja/cupons/${encodeURIComponent(existente.id)}`, { method: "PATCH", body: { revisao: existente.revisao, ...corpo } })
        : await erpRequest<{ cupom: CupomGestao }>("loja/cupons", { method: "POST", body: corpo });
      onSalvo(cupom, !existente);
    } catch (caught) { setErro(requestError(caught)); } finally { setSalvando(false); }
  }

  const codigoTravado = Boolean(existente && existente.usos > 0);
  const formId = "formulario-cupom";
  return <Dialog open={Boolean(alvo)} onClose={() => { if (!salvando) onFechar(); }} width="40rem" title={existente ? `Editar ${existente.codigo}` : "Novo cupom"} description="Vale um cupom por pedido. O desconto é calculado no servidor sobre o subtotal “a partir de”."
    footer={<Actions><Button variant="ghost" disabled={salvando} onClick={onFechar}>Cancelar</Button><Button type="submit" form={formId} loading={salvando}>{existente ? "Salvar cupom" : "Criar cupom"}</Button></Actions>}>
    <Form id={formId} onSubmit={(event) => void enviar(event)} noValidate>
      <FieldGrid>
        <TextField label="Código" required value={form.codigo} maxLength={30} disabled={codigoTravado} onChange={(event) => campo("codigo", event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
          hint={codigoTravado ? "Já usado: para outro código, crie um cupom novo." : "3 a 30 letras, números, - ou _"} trailing={codigoTravado ? undefined : <IconButton icon={ArrowsClockwiseIcon} label="Gerar outro código" variant="ghost" size="sm" onClick={() => campo("codigo", gerarCodigo())} />} />
        <TextField label="Descrição" value={form.descricao} maxLength={200} placeholder="Ex.: Campanha de Natal" onChange={(event) => campo("descricao", event.target.value)} hint="Aparece na sacola quando o cupom é exibido." />
        <Select label="Tipo" options={TIPOS} value={form.tipo} onChange={(tipo) => setForm((atual) => ({ ...atual, tipo, valor: tipo === atual.tipo ? atual.valor : tipo === "percentual" ? "10" : "" }))} />
        <TextField label={form.tipo === "percentual" ? "Percentual" : "Valor do desconto"} required inputMode={form.tipo === "percentual" ? "numeric" : "decimal"} value={form.valor} onChange={(event) => campo("valor", event.target.value)} placeholder={form.tipo === "percentual" ? "10" : "30,00"} trailing={<Unidade>{form.tipo === "percentual" ? "%" : "R$"}</Unidade>} hint={form.tipo === "percentual" ? "De 1 a 50." : "Em reais."} />
        <TextField label="Início" type="date" value={form.inicio} onChange={(event) => campo("inicio", event.target.value)} hint="Vazio: já vale. Começa às 00h (Brasília)." />
        <TextField label="Fim" type="date" value={form.fim} min={form.inicio || undefined} onChange={(event) => campo("fim", event.target.value)} hint="Vazio: sem prazo. Vale até 23h59 do dia." />
        <TextField label="Pedido mínimo" inputMode="decimal" value={form.minimo} placeholder="Sem mínimo" onChange={(event) => campo("minimo", event.target.value)} trailing={<Unidade>R$</Unidade>} hint="Subtotal “a partir de” da sacola." />
        <TextField label="Limite total de usos" inputMode="numeric" value={form.limiteTotal} placeholder="Sem limite" onChange={(event) => campo("limiteTotal", event.target.value.replace(/\D/g, ""))} hint="Esgotado, sai da sacola." />
        <TextField label="Limite por cliente" inputMode="numeric" value={form.limitePorCliente} placeholder="Sem limite" onChange={(event) => campo("limitePorCliente", event.target.value.replace(/\D/g, ""))} />
      </FieldGrid>
      <Opcoes>
        <OpcaoLinha><span><Nome>Só na primeira compra</Nome><Sub>Vale só para quem ainda não tem pedido (fora os cancelados).</Sub></span><Switch checked={form.primeiraCompra} onChange={(valor) => campo("primeiraCompra", valor)} label="Só na primeira compra" /></OpcaoLinha>
        <OpcaoLinha><span><Nome>Exibir na sacola</Nome><Sub>Aparece como sugestão no seletor de cupom da sacola.</Sub></span><Switch checked={form.exibir} onChange={(valor) => campo("exibir", valor)} label="Exibir na sacola" /></OpcaoLinha>
        <OpcaoLinha><span><Nome>Ativo</Nome><Sub>Desativado, o cupom deixa de valer na hora.</Sub></span><Switch checked={form.ativo} onChange={(valor) => campo("ativo", valor)} label="Ativo" /></OpcaoLinha>
      </Opcoes>
      {erro && <Notice role="alert">{erro}</Notice>}
    </Form>
  </Dialog>;
}

function UsosCupom({ cupom, onFechar }: { cupom: CupomGestao | null; onFechar: () => void }) {
  const [dados, setDados] = useState<RespostaUsosCupom | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function carregar(offset: number) {
    if (!cupom) return;
    setCarregando(true); setErro("");
    try {
      const resposta = await erpRequest<RespostaUsosCupom>(`loja/cupons/${encodeURIComponent(cupom.id)}/usos?limit=50&offset=${offset}`);
      setDados((atual) => (offset && atual ? { ...resposta, usos: [...atual.usos, ...resposta.usos] } : resposta));
    } catch (caught) { setErro(requestError(caught)); } finally { setCarregando(false); }
  }
  useEffect(() => { setDados(null); if (cupom) void carregar(0); }, [cupom?.id]);

  return <Dialog open={Boolean(cupom)} onClose={onFechar} width="38rem" title={cupom ? `Usos de ${cupom.codigo}` : "Usos"} description={cupom ? `${plural(cupom.usos, "uso", "usos")} · ${dinheiro(cupom.descontoTotalCentavos)} em desconto “a partir de”` : undefined}
    footer={<Actions>{dados?.pagination.hasMore && <Button variant="secondary" loading={carregando} onClick={() => void carregar(dados.usos.length)}>Carregar mais</Button>}<Button variant="ghost" onClick={onFechar}>Fechar</Button></Actions>}>
    {erro ? <Notice role="alert">{erro}</Notice> : !dados ? <Empty role="status">Carregando usos…</Empty> : !dados.usos.length ? <Empty><strong>Nenhum uso ainda.</strong><span>Cada pedido com o cupom aparece aqui.</span></Empty> : <Stack>
      <TituloSecao>Pedidos com o cupom</TituloSecao>
      <ListaUsos>{dados.usos.map((uso) => <li key={uso.id}>
        <span><LinkTexto href={`/ecommerce/pedidos?pedido=${encodeURIComponent(uso.pedidoNumero)}`}>{uso.pedidoNumero}</LinkTexto><Sub>{dataHora(uso.criadoEm)} · {uso.clienteId ? <LinkTexto href={`/ecommerce/clientes?cliente=${encodeURIComponent(uso.clienteId)}`}>{uso.clienteNome || "Cliente"}</LinkTexto> : "conta excluída"}</Sub></span>
        <strong>−{dinheiro(uso.descontoCentavos)}</strong>
      </li>)}</ListaUsos>
    </Stack>}
  </Dialog>;
}

const Reservado = styled.section`display: flex; gap: ${({ theme }) => theme.spacing(4)}; padding: ${({ theme }) => theme.spacing(4, 5)}; border: 1px dashed ${({ theme }) => theme.colors.border.default}; border-radius: ${({ theme }) => theme.radii.lg}; background: ${({ theme }) => theme.colors.background.surface}; > div { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; } ${({ theme }) => theme.media.sm} { padding: ${({ theme }) => theme.spacing(4)}; }`;
const IconeReservado = styled.span`display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.tones.lavender.soft}; color: ${({ theme }) => theme.tones.lavender.fg};`;
const Numeros = styled.div`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(1, 5)}; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; strong { color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }`;
const Unidade = styled.span`font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted};`;
const Opcoes = styled.div`display: flex; flex-direction: column; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.lg};`;
const OpcaoLinha = styled.div`display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(4)}; padding: ${({ theme }) => theme.spacing(3, 4)}; font-size: 0.8125rem; & + & { border-top: 1px solid ${({ theme }) => theme.colors.border.subtle}; } > span { min-width: 0; }`;
const ListaUsos = styled.ul`display: flex; flex-direction: column; list-style: none; font-size: 0.8125rem; > li { display: flex; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(2, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; } > li:last-of-type { border-bottom: 0; } strong { flex-shrink: 0; font-weight: ${({ theme }) => theme.fontWeights.medium}; }`;
