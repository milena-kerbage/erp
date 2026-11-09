"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, CaretDownIcon, CaretRightIcon, DotsThreeIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { TextField } from "@/components/ui/TextField";
import { Card, FieldGrid, Notice, Page, PageHeader, Pill, Stack, Toolbar } from "@/features/operations/components/ui";
import type { EntradaGrupoOpcoes, GrupoOpcoesComUso, TipoGrupoOpcoes } from "@/features/ecommerce/types";
import { conflito, erpRequest, loja, normalizar, reais, requestError, SLUG, slugificar, tamanho } from "./api";
import { AcoesCabecalho, Alca, Atencao, AvisoSomenteLeitura, CampoReais, Caminho, Confirmar, Sub, useArrastar, usePodeEditar, useRecurso } from "./comum";
import { novaChave } from "./editor/ListaTextos";

const TIPOS: Record<TipoGrupoOpcoes, { rotulo: string; descricao: string; tom: "blue" | "rose" }> = {
  escolha: { rotulo: "Escolha", descricao: "Seletor na página do produto (ex.: tamanho do berço).", tom: "blue" },
  personalizacao: { rotulo: "Personalização", descricao: "O “com/sem” bordado: uma opção só, com o acréscimo.", tom: "rose" },
};

type OpcaoEditavel = { id: string; existente?: string; rotulo: string; rotuloOriginal?: string; acrescimo: number | null; disponivel: boolean };

/**
 * Grupos de opções reaproveitáveis (escolha e personalização) com as opções, o acréscimo de preço e a
 * disponibilidade de cada uma. Mostra em quais produtos cada grupo é usado e avisa as limitações atuais
 * da página de produto e da sacola.
 */
export function Opcoes() {
  const podeEditar = usePodeEditar();
  const { dados, carregando, erro: erroCarga, recarregar } = useRecurso<{ grupos: GrupoOpcoesComUso[] }>(loja("opcoes"));
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const [edicao, setEdicao] = useState<{ grupo: GrupoOpcoesComUso | null } | null>(null);
  const [excluir, setExcluir] = useState<GrupoOpcoesComUso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const termo = normalizar(busca.trim());
  const grupos = (dados?.grupos ?? []).filter((grupo) => !termo || normalizar(`${grupo.nome} ${grupo.chave} ${grupo.opcoes.map((opcao) => opcao.rotulo).join(" ")}`).includes(termo));

  async function remover(grupo: GrupoOpcoesComUso) {
    setOcupado(true); setErro(""); setAviso("");
    try { await erpRequest(loja(`opcoes/${grupo.id}?revisao=${grupo.revisao}`), { method: "DELETE" }); setAviso(`“${grupo.nome}” foi excluído.`); await recarregar(); }
    catch (caught) { setErro(`${grupo.nome}: ${requestError(caught)}`); }
    finally { setOcupado(false); setExcluir(null); }
  }
  const alternar = (id: string) => setAbertos((atual) => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });

  return <Page>
    <PageHeader title="Opções" description="Grupos reaproveitáveis de escolha (ex.: tamanho do berço) e de personalização (ex.: bordado com nome), com o acréscimo de cada opção no preço “a partir de”."
      actions={<AcoesCabecalho>
        <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando && Boolean(dados)} onClick={() => void recarregar()}>Atualizar</Button>
        {podeEditar && <Button icon={PlusIcon} onClick={() => setEdicao({ grupo: null })}>Novo grupo</Button>}
      </AcoesCabecalho>} />
    {!podeEditar && <AvisoSomenteLeitura oque="os grupos de opções" />}
    <Atencao>Limitações atuais da loja: a página do produto mostra <strong>1 grupo de escolha</strong> (seletor obrigatório) e <strong>1 de personalização</strong> (com/sem bordado) por produto. Trocar o rótulo de uma opção invalida os itens que já estão nas sacolas com o rótulo antigo (a cliente precisa escolher de novo).</Atencao>
    {(erro || erroCarga) && <Notice role="alert">{erro || erroCarga} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}
    <Card>
      <Toolbar><SearchField label="Buscar grupos de opções" placeholder="Buscar por grupo ou opção" value={busca} onChange={(event) => setBusca(event.target.value)} /></Toolbar>
      {carregando && !dados ? <Stack role="status" aria-label="Carregando opções">{[0, 1, 2].map((indice) => <Skeleton key={indice} $height="5rem" $radius="lg" />)}</Stack>
        : !grupos.length ? <EmptyState icon={<SlidersHorizontalIcon size={24} />} title={erroCarga ? "A lista não pôde ser carregada." : termo ? "Nenhum grupo encontrado" : "Nenhum grupo de opções"} description={termo ? "Tente outro nome." : "Crie um grupo de escolha (ex.: Tamanho do berço) ou de personalização (ex.: Bordado com nome) e vincule aos produtos."}>
          {!termo && podeEditar && !erroCarga && <Button size="sm" icon={PlusIcon} onClick={() => setEdicao({ grupo: null })}>Novo grupo</Button>}
        </EmptyState>
        : <Grupos>{grupos.map((grupo) => {
          const aberto = abertos.has(grupo.id);
          return <GrupoCaixa key={grupo.id} aria-labelledby={`grupo-${grupo.id}`}>
            <Topo>
              <div>
                <h3 id={`grupo-${grupo.id}`}>{grupo.nome}</h3>
                <Selos><Pill $tone={TIPOS[grupo.tipo].tom}>{TIPOS[grupo.tipo].rotulo}</Pill>{grupo.tipo === "escolha" && <Pill $tone="neutral" $outline>{grupo.minimo > 0 ? "Obrigatório" : "Opcional"}{grupo.maximo > 1 ? ` · até ${grupo.maximo}` : ""}</Pill>}<Caminho>{grupo.chave}</Caminho></Selos>
                {grupo.descricao && <Sub>{grupo.descricao}</Sub>}
              </div>
              <Menu label={`Ações de ${grupo.nome}`} align="end" width="15rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} />}>
                <MenuItem icon={PencilSimpleIcon} onSelect={() => setEdicao({ grupo })}>{podeEditar ? "Editar" : "Ver detalhes"}</MenuItem>
                {podeEditar && <><MenuSeparator /><MenuItem icon={TrashIcon} muted disabled={grupo.produtos > 0} meta={grupo.produtos ? "em uso" : undefined} onSelect={() => setExcluir(grupo)}>Excluir</MenuItem></>}
              </Menu>
            </Topo>
            <TabelaOpcoes>
              <thead><tr><th>Opção</th><th>Acréscimo</th><th>Disponível</th></tr></thead>
              <tbody>{grupo.opcoes.map((opcao) => <tr key={opcao.id}><td>{opcao.rotulo}</td><td>{opcao.acrescimoCentavos ? `+ ${reais(opcao.acrescimoCentavos)}` : "—"}</td><td>{opcao.disponivel ? "Sim" : <Pill $tone="yellow">Indisponível</Pill>}</td></tr>)}</tbody>
            </TabelaOpcoes>
            <Uso>
              <Button variant="ghost" size="sm" icon={aberto ? CaretDownIcon : CaretRightIcon} disabled={!grupo.usadoEm.length} aria-expanded={aberto} onClick={() => alternar(grupo.id)}>
                {grupo.usadoEm.length ? `Usado em ${grupo.usadoEm.length} produto${grupo.usadoEm.length === 1 ? "" : "s"}` : "Ainda não usado em produtos"}
              </Button>
              {aberto && <ul>{grupo.usadoEm.map((produto) => <li key={produto.id}><Link href={`/ecommerce/produtos/${produto.id}`}>{produto.nome}</Link></li>)}</ul>}
            </Uso>
          </GrupoCaixa>;
        })}</Grupos>}
    </Card>

    {edicao && <EditorGrupo key={edicao.grupo?.id ?? "novo"} grupo={edicao.grupo} chaves={(dados?.grupos ?? []).filter((grupo) => grupo.id !== edicao.grupo?.id).map((grupo) => grupo.chave)} onFechar={() => setEdicao(null)}
      onSalvo={async (mensagem) => { setEdicao(null); setErro(""); setAviso(mensagem); await recarregar(); }} />}
    <Confirmar aberto={excluir !== null} titulo={`Excluir “${excluir?.nome ?? ""}”?`} acao="Excluir grupo" ocupado={ocupado} onFechar={() => setExcluir(null)} onConfirmar={() => excluir && void remover(excluir)}
      descricao="O grupo e as opções dele são apagados. Não dá para desfazer." />
  </Page>;
}

function EditorGrupo({ grupo, chaves, onFechar, onSalvo }: { grupo: GrupoOpcoesComUso | null; chaves: string[]; onFechar: () => void; onSalvo: (mensagem: string) => Promise<void> }) {
  const podeEditar = usePodeEditar();
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [chave, setChave] = useState(grupo?.chave ?? "");
  const [chaveManual, setChaveManual] = useState(Boolean(grupo));
  const [descricao, setDescricao] = useState(grupo?.descricao ?? "");
  const [tipo, setTipo] = useState<TipoGrupoOpcoes>(grupo?.tipo ?? "escolha");
  const [minimo, setMinimo] = useState(String(grupo?.minimo ?? 1));
  const [maximo, setMaximo] = useState(String(grupo?.maximo ?? 1));
  const [opcoes, setOpcoes] = useState<OpcaoEditavel[]>(() => grupo?.opcoes.map((opcao) => ({ id: opcao.id, existente: opcao.id, rotulo: opcao.rotulo, rotuloOriginal: opcao.rotulo, acrescimo: opcao.acrescimoCentavos || null, disponivel: opcao.disponivel })) ?? [{ id: novaChave(), rotulo: "", acrescimo: null, disponivel: true }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentou, setTentou] = useState(false);
  const { linha, alca } = useArrastar(opcoes, setOpcoes, undefined, podeEditar);
  const emUso = (grupo?.produtos ?? 0) > 0;

  const trocarTipo = (novo: TipoGrupoOpcoes) => {
    setTipo(novo);
    if (novo === "personalizacao") { setMinimo("0"); setMaximo("1"); setOpcoes((atuais) => atuais.length ? [atuais[0]] : [{ id: novaChave(), rotulo: "Bordado com nome", acrescimo: null, disponivel: true }]); }
    else { setMinimo("1"); setMaximo("1"); }
  };
  const renomeadas = opcoes.filter((opcao) => opcao.rotuloOriginal && opcao.rotuloOriginal !== opcao.rotulo.trim());
  const problemas = useMemo(() => {
    const lista: string[] = [];
    if (!nome.trim()) lista.push("Informe o nome do grupo.");
    if (!SLUG.test(chave)) lista.push("Identificador: letras minúsculas, números e hífens.");
    else if (chaves.includes(chave)) lista.push("Já existe um grupo com esse identificador.");
    if (!opcoes.length || opcoes.length > 50) lista.push("Informe de 1 a 50 opções.");
    if (opcoes.some((opcao) => !opcao.rotulo.trim())) lista.push("Toda opção precisa de um rótulo.");
    if (opcoes.some((opcao) => tamanho(opcao.rotulo.trim()) > 80)) lista.push("Rótulos com até 80 caracteres.");
    if (new Set(opcoes.map((opcao) => opcao.rotulo.trim().toLocaleLowerCase("pt-BR"))).size !== opcoes.length) lista.push("Há opções com o mesmo rótulo.");
    if (tipo === "personalizacao" && opcoes.length !== 1) lista.push("A personalização tem uma opção só.");
    const [min, max] = [Number(minimo), Number(maximo)];
    if (tipo === "escolha" && (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 1 || min > 20 || max > 20 || min > max)) lista.push("Mínimo de 0 a 20, máximo de 1 a 20, e o mínimo não passa do máximo.");
    return lista;
  }, [nome, chave, chaves, opcoes, tipo, minimo, maximo]);

  async function salvar() {
    setTentou(true);
    if (problemas.length) return;
    setSalvando(true); setErro("");
    const corpo: EntradaGrupoOpcoes = {
      nome: nome.trim(), chave, descricao: descricao.trim(), tipo, minimo: tipo === "personalizacao" ? 0 : Number(minimo), maximo: tipo === "personalizacao" ? 1 : Number(maximo),
      opcoes: opcoes.map((opcao) => ({ ...(opcao.existente ? { id: opcao.existente } : {}), rotulo: opcao.rotulo.trim(), acrescimoCentavos: opcao.acrescimo ?? 0, disponivel: opcao.disponivel })),
    };
    try {
      if (grupo) await erpRequest(loja(`opcoes/${grupo.id}`), { method: "PATCH", body: { revisao: grupo.revisao, ...corpo } });
      else await erpRequest(loja("opcoes"), { method: "POST", body: corpo });
      await onSalvo(grupo ? `“${corpo.nome}” foi salvo.${grupo.produtos ? " Os produtos que usam o grupo já mostram as opções novas." : ""}` : `“${corpo.nome}” foi criado. Vincule aos produtos na seção Opções do produto.`);
    } catch (caught) { setErro(conflito(caught) ? "Outra pessoa alterou este grupo. Feche, atualize e tente de novo." : requestError(caught)); }
    finally { setSalvando(false); }
  }

  return <Dialog open onClose={() => { if (!salvando) onFechar(); }} title={grupo ? (podeEditar ? `Editar “${grupo.nome}”` : grupo.nome) : "Novo grupo de opções"} width="44rem" height="46rem"
    description={grupo?.usadoEm.length ? `Usado em ${grupo.usadoEm.length} produto(s): ${grupo.usadoEm.slice(0, 3).map((produto) => produto.nome).join(", ")}${grupo.usadoEm.length > 3 ? "…" : ""}` : "Ainda não usado em produtos."}
    footer={<><Button variant="ghost" disabled={salvando} onClick={onFechar}>{podeEditar ? "Cancelar" : "Fechar"}</Button>{podeEditar && <Button loading={salvando} onClick={() => void salvar()}>{grupo ? "Salvar grupo" : "Criar grupo"}</Button>}</>}>
    <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        {erro && <Notice role="alert">{erro}</Notice>}
        {tentou && problemas.length > 0 && <Notice role="alert">{problemas.join(" ")}</Notice>}
        <FieldGrid>
          <TextField label="Nome" value={nome} maxLength={80} onChange={(event) => { setNome(event.target.value); if (!chaveManual) setChave(slugificar(event.target.value, 80)); }} placeholder="Ex.: Tamanho do berço" hint="Aparece como título do seletor na loja." />
          <TextField label="Identificador" value={chave} maxLength={80} onChange={(event) => { setChaveManual(true); setChave(slugificar(event.target.value.replace(/\s/g, "-"), 80) + (event.target.value.endsWith("-") ? "-" : "")); }} hint="Uso interno (ex.: tamanho-do-berco)." />
        </FieldGrid>
        <TextField label="Descrição (opcional)" value={descricao} maxLength={300} onChange={(event) => setDescricao(event.target.value)} hint="Nota interna sobre o grupo." />
        <FieldGrid>
          <Select label="Tipo" value={tipo} onChange={trocarTipo} options={(Object.keys(TIPOS) as TipoGrupoOpcoes[]).map((valor) => ({ value: valor, label: TIPOS[valor].rotulo, description: TIPOS[valor].descricao, disabled: emUso && valor !== grupo?.tipo }))}
            hint={emUso ? "O grupo já está em produtos: para outro tipo, crie um grupo novo." : undefined} />
          {tipo === "escolha" ? <Pequenos>
            <TextField label="Mínimo" inputMode="numeric" value={minimo} onChange={(event) => setMinimo(event.target.value.replace(/\D/g, "").slice(0, 2))} hint="1 = obrigatório" />
            <TextField label="Máximo" inputMode="numeric" value={maximo} onChange={(event) => setMaximo(event.target.value.replace(/\D/g, "").slice(0, 2))} hint="Hoje a loja usa 1" />
          </Pequenos> : <Sub>Personalização é opcional (a cliente escolhe com ou sem): mínimo 0, máximo 1.</Sub>}
        </FieldGrid>
        <Opcoes_>
          <CabecalhoOpcoes><span>Opções</span><Sub>{tipo === "personalizacao" ? "Uma opção: o rótulo e o acréscimo do “com”." : "Arraste pela alça para mudar a ordem do seletor."}</Sub></CabecalhoOpcoes>
          {opcoes.map((opcao, posicao) => <LinhaOpcao key={opcao.id} {...linha(opcao, posicao)}>
            <Alca rotulo={`Opção ${posicao + 1}`} {...alca(opcao, posicao)} disabled={!podeEditar || tipo === "personalizacao"} />
            <TextField label="Rótulo" hideLabel={posicao > 0} value={opcao.rotulo} maxLength={80} placeholder={tipo === "personalizacao" ? "Bordado com nome" : "Berço americano · 70 × 130 cm"} onChange={(event) => setOpcoes(opcoes.map((outra) => (outra.id === opcao.id ? { ...outra, rotulo: event.target.value } : outra)))} />
            <CampoReais rotulo={posicao ? `Acréscimo da opção ${posicao + 1}` : "Acréscimo"} ocultarRotulo={posicao > 0} valor={opcao.acrescimo} onChange={(valor) => setOpcoes(opcoes.map((outra) => (outra.id === opcao.id ? { ...outra, acrescimo: valor } : outra)))} placeholder="R$ 0,00" />
            <Disponivel>{posicao === 0 && <span>Disponível</span>}<Switch checked={opcao.disponivel} label={`${opcao.rotulo || "Opção"} disponível`} onChange={(valor) => setOpcoes(opcoes.map((outra) => (outra.id === opcao.id ? { ...outra, disponivel: valor } : outra)))} disabled={!podeEditar} /></Disponivel>
            <IconButton icon={TrashIcon} label={`Remover opção ${posicao + 1}`} variant="ghost" size="sm" tooltip="left" disabled={!podeEditar || opcoes.length <= 1} onClick={() => setOpcoes(opcoes.filter((outra) => outra.id !== opcao.id))} />
          </LinhaOpcao>)}
          {tipo === "escolha" && <Button variant="ghost" size="sm" icon={PlusIcon} disabled={!podeEditar || opcoes.length >= 50} onClick={() => setOpcoes([...opcoes, { id: novaChave(), rotulo: "", acrescimo: null, disponivel: true }])}>Adicionar opção</Button>}
        </Opcoes_>
        {renomeadas.length > 0 && emUso && <Atencao>Você trocou o rótulo de {renomeadas.map((opcao) => `“${opcao.rotuloOriginal}”`).join(", ")}. Quem já tem esse item na sacola vai precisar escolher a opção de novo.</Atencao>}
        {grupo && opcoes.length < grupo.opcoes.length && emUso && <Atencao>Opções removidas somem da página dos produtos; itens na sacola com elas pedem uma nova escolha.</Atencao>}
      </Stack>
    </fieldset>
  </Dialog>;
}

/* ---------- Estilos ---------- */

const Grupos = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); gap: ${({ theme }) => theme.spacing(3)};`;

const GrupoCaixa = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  min-width: 0;

  h3 { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
`;
const Topo = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)}; > div { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1.5)}; min-width: 0; }`;
const Selos = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: ${({ theme }) => theme.spacing(1.5)};`;

const TabelaOpcoes = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th { padding: ${({ theme }) => theme.spacing(1.5, 2)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; font-size: ${({ theme }) => theme.fontSizes.xs}; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.muted}; text-align: left; }
  td { padding: ${({ theme }) => theme.spacing(1.5, 2)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint}; color: ${({ theme }) => theme.colors.text.primary}; overflow-wrap: anywhere; }
  td:nth-of-type(2), td:nth-of-type(3) { white-space: nowrap; }
  tr:last-of-type td { border-bottom: 0; }
`;

const Uso = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(1.5)};
  margin-top: auto;

  ul { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; padding-left: ${({ theme }) => theme.spacing(6)}; font-size: 0.8125rem; }
  a { color: ${({ theme }) => theme.colors.text.primary}; text-decoration: underline; text-decoration-color: ${({ theme }) => theme.colors.border.strong}; text-underline-offset: 3px; }
`;

const Pequenos = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: ${({ theme }) => theme.spacing(2)};`;
const Opcoes_ = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; > button { align-self: flex-start; }`;
const CabecalhoOpcoes = styled.div`display: flex; flex-direction: column; gap: 2px; > span { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; }`;

const LinhaOpcao = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 9rem auto auto;
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: end;
  padding: ${({ theme }) => theme.spacing(1, 0)};
  &[data-arrastando] { opacity: 0.45; }
  > button:first-of-type { margin-bottom: 0.25rem; }

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding-bottom: ${({ theme }) => theme.spacing(3)};
    border-bottom: 1px dashed ${({ theme }) => theme.colors.border.subtle};
    > div:nth-of-type(2) { grid-column: 2; }
    > div:nth-of-type(3) { grid-column: 2; }
    > button:last-of-type { grid-row: 1; grid-column: 3; }
  }
`;
const Disponivel = styled.div`display: flex; flex-direction: column; align-items: flex-start; gap: ${({ theme }) => theme.spacing(1.5)}; padding-bottom: 0.4rem; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted};`;
