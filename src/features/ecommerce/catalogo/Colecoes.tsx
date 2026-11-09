"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, DotsThreeIcon, PencilSimpleIcon, PlusIcon, StackIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { TextField } from "@/components/ui/TextField";
import { Card, FieldGrid, Notice, Page, PageHeader, Pill, Stack } from "@/features/operations/components/ui";
import { Divider, ToggleRow } from "@/features/settings/components/ui";
import type { ColecaoGestao, EntradaColecao, OndeColecao, ReferenciaProduto } from "@/features/ecommerce/types";
import { conflito, erpRequest, loja, requestError, SLUG, slugificar } from "./api";
import { AcoesCabecalho, Alca, AvisoSomenteLeitura, Caminho, Confirmar, Sub, useArrastar, usePodeEditar, useRecurso } from "./comum";
import { ListaProdutos } from "./editor/BuscaProduto";

const ONDE: Record<OndeColecao, string> = { home: "Home", listagem: "Listagens", ambos: "Home e listagens" };
/** Slugs que a home já procura (src/lib/loja/gestao/catalogoBanco.ts). */
const ESPECIAIS: Record<string, string> = { "mais-vendidos": "Vitrine “Mais vendidos” da home", "pronta-entrega": "Vitrine de pronta entrega da home" };

/**
 * Coleções (vitrines curadas): onde aparecem, ativa, ordem entre elas e os produtos de cada uma, em
 * ordem, com busca para adicionar. A home usa "mais-vendidos" e, se existir, "pronta-entrega".
 */
export function Colecoes() {
  const podeEditar = usePodeEditar();
  const { dados, carregando, erro: erroCarga, recarregar } = useRecurso<{ colecoes: ColecaoGestao[] }>(loja("colecoes"));
  const [ordem, setOrdem] = useState<ColecaoGestao[]>([]);
  useEffect(() => setOrdem(dados?.colecoes ?? []), [dados]);
  const [edicao, setEdicao] = useState<{ colecao: ColecaoGestao | null } | null>(null);
  const [excluir, setExcluir] = useState<ColecaoGestao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function tarefa(rotulo: string, executar: () => Promise<void>) {
    setOcupado(true); setErro(""); setAviso("");
    try { await executar(); }
    catch (caught) { setErro(`${rotulo}: ${conflito(caught) ? "outra pessoa alterou a coleção; a lista foi atualizada." : requestError(caught)}`); }
    finally { setOcupado(false); await recarregar(); }
  }
  // Não há rota de ordem para coleções: cada uma guarda a sua `ordem` (0, 10, 20…); só as que mudaram são gravadas.
  const gravarOrdem = (nova: ColecaoGestao[]) => {
    const mudaram = nova.map((colecao, posicao) => ({ colecao, ordem: posicao * 10 })).filter(({ colecao, ordem: valor }) => colecao.ordem !== valor);
    if (!mudaram.length) return;
    void tarefa("Ordem", async () => {
      for (const { colecao, ordem: valor } of mudaram) await erpRequest(loja(`colecoes/${colecao.id}`), { method: "PATCH", body: { revisao: colecao.revisao, ordem: valor } });
      setAviso("Ordem das coleções salva.");
    });
  };
  const { linha, alca } = useArrastar(ordem, setOrdem, gravarOrdem, podeEditar && !ocupado);
  const alternar = (colecao: ColecaoGestao) => tarefa(colecao.nome, async () => {
    await erpRequest(loja(`colecoes/${colecao.id}`), { method: "PATCH", body: { revisao: colecao.revisao, ativa: !colecao.ativa } });
    setAviso(colecao.ativa ? `“${colecao.nome}” saiu da loja.` : `“${colecao.nome}” está ativa na loja.`);
  });
  const remover = (colecao: ColecaoGestao) => tarefa(colecao.nome, async () => {
    await erpRequest(loja(`colecoes/${colecao.id}?revisao=${colecao.revisao}`), { method: "DELETE" });
    setAviso(`“${colecao.nome}” foi excluída (os produtos continuam cadastrados).`);
  }).finally(() => setExcluir(null));

  return <Page>
    <PageHeader title="Coleções" description="Vitrines curadas de produtos, na ordem que você escolher. A home mostra a “mais-vendidos” e, se existir, a “pronta-entrega”."
      actions={<AcoesCabecalho>
        <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando && Boolean(dados)} onClick={() => void recarregar()}>Atualizar</Button>
        {podeEditar && <Button icon={PlusIcon} onClick={() => setEdicao({ colecao: null })}>Nova coleção</Button>}
      </AcoesCabecalho>} />
    {!podeEditar && <AvisoSomenteLeitura oque="as coleções" />}
    {(erro || erroCarga) && <Notice role="alert">{erro || erroCarga} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}
    <Card>
      {carregando && !dados ? <Stack role="status" aria-label="Carregando coleções">{[0, 1, 2].map((indice) => <Skeleton key={indice} $height="3.5rem" $radius="md" />)}</Stack>
        : !ordem.length ? <EmptyState icon={<StackIcon size={24} />} title={erroCarga ? "A lista não pôde ser carregada." : "Nenhuma coleção"} description="Crie a “Mais vendidos” (slug mais-vendidos) para escolher os produtos da vitrine da home.">
          {podeEditar && !erroCarga && <Button size="sm" icon={PlusIcon} onClick={() => setEdicao({ colecao: null })}>Nova coleção</Button>}
        </EmptyState>
        : <>
          {podeEditar && <Sub>Arraste pela alça para mudar a ordem entre as coleções.</Sub>}
          <Lista aria-label="Coleções">{ordem.map((colecao, posicao) => <li key={colecao.id} {...linha(colecao, posicao)}>
            {podeEditar && <Alca rotulo={`${colecao.nome}, posição ${posicao + 1}`} {...alca(colecao, posicao)} disabled={ocupado} />}
            <Texto>
              <button type="button" onClick={() => setEdicao({ colecao })}><strong>{colecao.nome}</strong></button>
              <Sub><Caminho>{colecao.slug}</Caminho>{ESPECIAIS[colecao.slug] ? ` · ${ESPECIAIS[colecao.slug]}` : ""}</Sub>
              {colecao.produtos.length > 0 && <Sub>{colecao.produtos.slice(0, 4).map((produto) => produto.nome).join(" · ")}{colecao.produtos.length > 4 ? ` · +${colecao.produtos.length - 4}` : ""}</Sub>}
            </Texto>
            <Selos>
              <Pill $tone="neutral" $outline>{colecao.produtos.length} produto{colecao.produtos.length === 1 ? "" : "s"}</Pill>
              <Pill $tone="blue">{ONDE[colecao.onde]}</Pill>
              {!colecao.ativa && <Pill $tone="yellow">Inativa</Pill>}
            </Selos>
            <Switch checked={colecao.ativa} label={colecao.ativa ? `Desativar ${colecao.nome}` : `Ativar ${colecao.nome}`} disabled={!podeEditar || ocupado} onChange={() => void alternar(colecao)} />
            <Menu label={`Ações de ${colecao.nome}`} align="end" width="14rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} />}>
              <MenuItem icon={PencilSimpleIcon} onSelect={() => setEdicao({ colecao })}>{podeEditar ? "Editar e ordenar produtos" : "Ver produtos"}</MenuItem>
              {podeEditar && <><MenuSeparator /><MenuItem icon={TrashIcon} muted onSelect={() => setExcluir(colecao)}>Excluir</MenuItem></>}
            </Menu>
          </li>)}</Lista>
        </>}
    </Card>

    {edicao && <EditorColecao key={edicao.colecao?.id ?? "nova"} colecao={edicao.colecao} slugs={(dados?.colecoes ?? []).filter((colecao) => colecao.id !== edicao.colecao?.id).map((colecao) => colecao.slug)}
      proximaOrdem={((dados?.colecoes ?? []).reduce((maior, colecao) => Math.max(maior, colecao.ordem), -10)) + 10} onFechar={() => setEdicao(null)}
      onSalvo={async (mensagem) => { setEdicao(null); setErro(""); setAviso(mensagem); await recarregar(); }} />}
    <Confirmar aberto={excluir !== null} titulo={`Excluir “${excluir?.nome ?? ""}”?`} acao="Excluir coleção" ocupado={ocupado} onFechar={() => setExcluir(null)} onConfirmar={() => excluir && void remover(excluir)}
      descricao={<>A vitrine sai da loja{excluir && ESPECIAIS[excluir.slug] ? ` (a home volta a escolher os produtos sozinha)` : ""}. Os produtos continuam cadastrados. Não dá para desfazer.</>} />
  </Page>;
}

function EditorColecao({ colecao, slugs, proximaOrdem, onFechar, onSalvo }: { colecao: ColecaoGestao | null; slugs: string[]; proximaOrdem: number; onFechar: () => void; onSalvo: (mensagem: string) => Promise<void> }) {
  const podeEditar = usePodeEditar();
  const [nome, setNome] = useState(colecao?.nome ?? "");
  const [slug, setSlug] = useState(colecao?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(colecao));
  const [descricao, setDescricao] = useState(colecao?.descricao ?? "");
  const [onde, setOnde] = useState<OndeColecao>(colecao?.onde ?? "home");
  const [ativa, setAtiva] = useState(colecao?.ativa ?? true);
  const [produtos, setProdutos] = useState<ReferenciaProduto[]>(colecao?.produtos ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentou, setTentou] = useState(false);
  const erros = { nome: nome.trim() ? undefined : "Informe o nome.", slug: !SLUG.test(slug) ? "Letras minúsculas, números e hífens." : slugs.includes(slug) ? "Já existe uma coleção com esse slug." : undefined };

  async function salvar() {
    setTentou(true);
    if (erros.nome || erros.slug) return;
    setSalvando(true); setErro("");
    const corpo: EntradaColecao = { nome: nome.trim(), slug, descricao: descricao.trim(), onde, ativa, produtos: produtos.map((produto) => produto.id) };
    try {
      if (colecao) await erpRequest(loja(`colecoes/${colecao.id}`), { method: "PATCH", body: { revisao: colecao.revisao, ...corpo } });
      else await erpRequest(loja("colecoes"), { method: "POST", body: { ...corpo, ordem: Math.max(0, proximaOrdem) } });
      await onSalvo(colecao ? `“${corpo.nome}” foi salva.` : `“${corpo.nome}” foi criada.`);
    } catch (caught) { setErro(conflito(caught) ? "Outra pessoa alterou esta coleção. Feche, atualize e tente de novo." : requestError(caught)); }
    finally { setSalvando(false); }
  }

  return <Dialog open onClose={() => { if (!salvando) onFechar(); }} title={colecao ? (podeEditar ? `Editar “${colecao.nome}”` : colecao.nome) : "Nova coleção"} width="42rem" height="46rem"
    description={ESPECIAIS[slug] ?? "Só os produtos ativos aparecem na loja, na ordem da lista."}
    footer={<><Button variant="ghost" disabled={salvando} onClick={onFechar}>{podeEditar ? "Cancelar" : "Fechar"}</Button>{podeEditar && <Button loading={salvando} onClick={() => void salvar()}>{colecao ? "Salvar coleção" : "Criar coleção"}</Button>}</>}>
    <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        {erro && <Notice role="alert">{erro}</Notice>}
        <FieldGrid>
          <TextField label="Nome" value={nome} maxLength={80} error={tentou ? erros.nome : undefined} onChange={(event) => { setNome(event.target.value); if (!slugManual) setSlug(slugificar(event.target.value, 80)); }} placeholder="Ex.: Mais vendidos" />
          <TextField label="Slug" value={slug} maxLength={80} error={tentou ? erros.slug : undefined} onChange={(event) => { setSlugManual(true); setSlug(slugificar(event.target.value.replace(/\s/g, "-"), 80) + (event.target.value.endsWith("-") ? "-" : "")); }} hint="mais-vendidos e pronta-entrega abastecem a home." />
        </FieldGrid>
        <TextField label="Descrição (opcional)" multiline rows={2} value={descricao} maxLength={500} onChange={(event) => setDescricao(event.target.value)} />
        <FieldGrid>
          <Select label="Onde aparece" value={onde} onChange={setOnde} options={(Object.keys(ONDE) as OndeColecao[]).map((valor) => ({ value: valor, label: ONDE[valor] }))} />
          <div><ToggleRow title="Ativa" description="Inativa, a vitrine some da loja." checked={ativa} onChange={setAtiva} disabled={!podeEditar} /></div>
        </FieldGrid>
        <Divider />
        <Rotulo>Produtos ({produtos.length}) <Sub>Arraste para ordenar; a ordem é a da vitrine.</Sub></Rotulo>
        <ListaProdutos itens={produtos} onChange={setProdutos} maximo={200} disabled={!podeEditar} vazio="Nenhum produto ainda. Busque abaixo para adicionar." />
      </Stack>
    </fieldset>
  </Dialog>;
}

/* ---------- Estilos ---------- */

const Rotulo = styled.div`display: flex; flex-direction: column; gap: 2px; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium};`;

const Lista = styled.ol`
  display: flex;
  flex-direction: column;
  list-style: none;

  > li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2)};
    padding: ${({ theme }) => theme.spacing(3, 1)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};

    &:last-of-type { border-bottom: 0; }
    &[data-arrastando] { opacity: 0.45; }
  }

  ${({ theme }) => theme.media.sm} { > li { flex-wrap: wrap; } }
`;
const Texto = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 12rem;
  font-size: 0.8125rem;

  > button { align-self: flex-start; text-align: left; color: ${({ theme }) => theme.colors.text.primary}; &:hover strong { text-decoration: underline; text-underline-offset: 3px; } }
  strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; }
`;
const Selos = styled.span`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(1)};`;
