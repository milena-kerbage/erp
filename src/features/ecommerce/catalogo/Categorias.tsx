"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import {
  ArrowClockwiseIcon, ArrowDownIcon, ArrowSquareOutIcon, ArrowUpIcon, CaretDownIcon, CaretRightIcon, DotsThreeIcon, FolderSimpleIcon, FolderSimplePlusIcon, PencilSimpleIcon, PlusIcon, TrashIcon,
} from "@phosphor-icons/react";
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
import { Card, FieldGrid, Notice, Page, PageHeader, Pill, Stack } from "@/features/operations/components/ui";
import { Divider, ToggleRow } from "@/features/settings/components/ui";
import type { CategoriaGestao, EntradaCategoria, NoCategoriaGestao, RespostaCategorias } from "@/features/ecommerce/types";
import { conflito, erpRequest, loja, normalizar, requestError, SLUG, slugificar, tamanho, trilhasDeCategorias } from "./api";
import { AcoesCabecalho, Alca, AvisoSomenteLeitura, CampoImagemLoja, Caminho, Confirmar, Contador, Sub, useArrastar, usePodeEditar, useRecurso } from "./comum";

const PROFUNDIDADE = 4;
const nivelDe = (caminho: string) => caminho.split("/").length;
type Edicao = { categoria: CategoriaGestao | null; paiId: string | null } | null;

/**
 * Categorias da loja em árvore (até 4 níveis): ordem por arrastar ou pelo menu, ativar/desativar, criar,
 * editar (nome, slug, mãe, descrição, imagem e SEO) e excluir (sem filhas e sem produtos). O caminho é o
 * endereço da listagem na loja e muda junto com o slug ou a mãe (as filhas acompanham).
 */
export function Categorias({ origemLoja }: { origemLoja: string }) {
  const podeEditar = usePodeEditar();
  const { dados, setDados, carregando, erro: erroCarga, recarregar } = useRecurso<RespostaCategorias>(loja("categorias"));
  const [busca, setBusca] = useState("");
  const [fechadas, setFechadas] = useState<Set<string>>(() => new Set());
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [excluir, setExcluir] = useState<CategoriaGestao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const termo = normalizar(busca.trim());
  const visiveis = useMemo(() => {
    if (!termo || !dados) return null;
    const ids = new Set<string>();
    const visitar = (no: NoCategoriaGestao, trilha: string[]): boolean => {
      const proprio = normalizar(`${no.nome} ${no.caminho}`).includes(termo);
      const algumaFilha = no.filhos.map((filho) => visitar(filho, [...trilha, no.id])).some(Boolean);
      if (proprio || algumaFilha) { ids.add(no.id); trilha.forEach((id) => ids.add(id)); }
      return proprio || algumaFilha;
    };
    dados.arvore.forEach((no) => visitar(no, []));
    return ids;
  }, [termo, dados]);

  async function acao(rotulo: string, tarefa: () => Promise<void>) {
    setOcupado(true); setErro(""); setAviso("");
    try { await tarefa(); }
    catch (caught) { setErro(`${rotulo}: ${conflito(caught) ? "a categoria foi alterada por outra pessoa. A lista foi atualizada; tente de novo." : requestError(caught)}`); await recarregar(); }
    finally { setOcupado(false); }
  }
  const ordenar = (paiId: string | null, ids: string[]) => acao("Ordem", async () => { setDados(await erpRequest<RespostaCategorias>(loja("categorias/ordem"), { method: "PUT", body: { paiId, ids } })); setAviso("Ordem salva. O menu e as listagens da loja já seguem a nova ordem."); });
  const alternar = (categoria: CategoriaGestao) => acao(categoria.nome, async () => {
    await erpRequest(loja(`categorias/${categoria.id}`), { method: "PATCH", body: { revisao: categoria.revisao, ativa: !categoria.ativa } });
    await recarregar();
    setAviso(categoria.ativa ? `“${categoria.nome}” foi desativada: a listagem e as filhas saem da loja (os produtos continuam cadastrados).` : `“${categoria.nome}” está ativa na loja.`);
  });
  const remover = (categoria: CategoriaGestao) => acao(categoria.nome, async () => {
    await erpRequest(loja(`categorias/${categoria.id}?revisao=${categoria.revisao}`), { method: "DELETE" });
    setExcluir(null); await recarregar(); setAviso(`“${categoria.nome}” foi excluída.`);
  }).finally(() => setExcluir(null));

  const porId = useMemo(() => new Map((dados?.categorias ?? []).map((categoria) => [categoria.id, categoria])), [dados]);
  const inativaPelaMae = (categoria: CategoriaGestao): boolean => {
    for (let mae = categoria.paiId ? porId.get(categoria.paiId) : undefined; mae; mae = mae.paiId ? porId.get(mae.paiId) : undefined) if (!mae.ativa) return true;
    return false;
  };
  const alternarAberta = (id: string) => setFechadas((atual) => { const nova = new Set(atual); if (nova.has(id)) nova.delete(id); else nova.add(id); return nova; });

  const contexto: Contexto = {
    podeEditar, ocupado, filtrando: Boolean(termo), visiveis, fechadas, origemLoja, alternarAberta, inativaPelaMae, ordenar,
    editar: (categoria) => setEdicao({ categoria, paiId: categoria.paiId }), novaFilha: (pai) => setEdicao({ categoria: null, paiId: pai.id }), alternar, excluir: setExcluir,
  };
  const total = dados?.categorias.length ?? 0;

  return <Page>
    <PageHeader title="Categorias" description="A árvore das listagens da loja (até 4 níveis). A ordem aqui é a do menu de filtros e das trilhas; o caminho é o endereço da listagem."
      actions={<AcoesCabecalho>
        <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando && Boolean(dados)} onClick={() => void recarregar()}>Atualizar</Button>
        {podeEditar && <Button icon={PlusIcon} onClick={() => setEdicao({ categoria: null, paiId: null })}>Nova categoria</Button>}
      </AcoesCabecalho>} />
    {!podeEditar && <AvisoSomenteLeitura oque="as categorias" />}
    {(erro || erroCarga) && <Notice role="alert">{erro || erroCarga} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}
    <Card>
      <Barra>
        <SearchField label="Buscar categorias" placeholder="Buscar por nome ou caminho" value={busca} onChange={(event) => setBusca(event.target.value)} />
        <Button variant="ghost" size="sm" onClick={() => setFechadas(fechadas.size ? new Set() : new Set((dados?.categorias ?? []).filter((categoria) => dados?.arvore && temFilhas(dados.arvore, categoria.id)).map((categoria) => categoria.id)))}>{fechadas.size ? "Expandir tudo" : "Recolher tudo"}</Button>
      </Barra>
      {carregando && !dados ? <Esqueleto /> : !total ? (
        <EmptyState icon={<FolderSimpleIcon size={24} />} title={erroCarga ? "A lista não pôde ser carregada." : "Nenhuma categoria cadastrada"} description="Crie as categorias principais (ex.: Kit berço, Enxoval) e as subcategorias dentro delas.">
          {podeEditar && !erroCarga && <Button size="sm" icon={PlusIcon} onClick={() => setEdicao({ categoria: null, paiId: null })}>Nova categoria</Button>}
        </EmptyState>
      ) : visiveis && !visiveis.size ? <EmptyState icon={<FolderSimpleIcon size={24} />} title="Nenhuma categoria encontrada" description="Tente outro nome ou parte do caminho."><Button size="sm" variant="secondary" onClick={() => setBusca("")}>Limpar busca</Button></EmptyState>
        : <>
          <Dica>{termo ? "Com a busca ativa, a ordem fica travada. Limpe a busca para arrastar." : podeEditar ? "Arraste pela alça (ou use as setas) para mudar a ordem entre as irmãs." : `${total} categorias.`}</Dica>
          <Irmas nos={dados?.arvore ?? []} paiId={null} nivel={1} contexto={contexto} />
        </>}
    </Card>

    {edicao && <EditorCategoria key={edicao.categoria?.id ?? `nova-${edicao.paiId ?? "raiz"}`} edicao={edicao} categorias={dados?.categorias ?? []} arvore={dados?.arvore ?? []} onFechar={() => setEdicao(null)}
      onSalvo={async (mensagem) => { setEdicao(null); setErro(""); setAviso(mensagem); await recarregar(); }} />}
    <Confirmar aberto={excluir !== null} titulo={`Excluir “${excluir?.nome ?? ""}”?`} acao="Excluir categoria" ocupado={ocupado} onFechar={() => setExcluir(null)} onConfirmar={() => excluir && void remover(excluir)}
      descricao={<>A listagem <Caminho>/{excluir?.caminho}</Caminho> deixa de existir na loja e os produtos que a usavam como categoria extra saem dela. Não dá para desfazer. Se for temporário, desative em vez de excluir.</>} />
  </Page>;
}

type Contexto = {
  podeEditar: boolean; ocupado: boolean; filtrando: boolean; visiveis: Set<string> | null; fechadas: Set<string>; origemLoja: string;
  alternarAberta: (id: string) => void; inativaPelaMae: (categoria: CategoriaGestao) => boolean; ordenar: (paiId: string | null, ids: string[]) => Promise<void>;
  editar: (categoria: CategoriaGestao) => void; novaFilha: (pai: CategoriaGestao) => void; alternar: (categoria: CategoriaGestao) => Promise<void>; excluir: (categoria: CategoriaGestao) => void;
};

const temFilhas = (arvore: NoCategoriaGestao[], id: string): boolean => arvore.some((no) => (no.id === id ? no.filhos.length > 0 : temFilhas(no.filhos, id)));

/** Um nível da árvore: as irmãs de uma mãe, reordenáveis entre si. */
function Irmas({ nos, paiId, nivel, contexto }: { nos: NoCategoriaGestao[]; paiId: string | null; nivel: number; contexto: Contexto }) {
  const [ordem, setOrdem] = useState(nos);
  useEffect(() => setOrdem(nos), [nos]);
  const original = nos.map((no) => no.id).join();
  const gravar = (nova: NoCategoriaGestao[]) => { if (nova.map((no) => no.id).join() !== original) void contexto.ordenar(paiId, nova.map((no) => no.id)); };
  const { linha, alca } = useArrastar(ordem, setOrdem, gravar, contexto.podeEditar && !contexto.filtrando && !contexto.ocupado);
  const mostrar = ordem.filter((no) => !contexto.visiveis || contexto.visiveis.has(no.id));
  return <Arvore $nivel={nivel} role={nivel === 1 ? "tree" : "group"} aria-label={nivel === 1 ? "Categorias da loja" : undefined}>
    {mostrar.map((no) => {
      const posicao = ordem.findIndex((outro) => outro.id === no.id);
      const aberta = contexto.filtrando || !contexto.fechadas.has(no.id);
      const herdada = no.ativa && contexto.inativaPelaMae(no);
      return <li key={no.id} role="treeitem" aria-expanded={no.filhos.length ? aberta : undefined} aria-selected={false} {...linha(no, posicao)}>
        <LinhaNo $inativa={!no.ativa || herdada}>
          {contexto.podeEditar && <Alca rotulo={`${no.nome}, posição ${posicao + 1} de ${ordem.length}`} {...alca(no, posicao)} disabled={contexto.filtrando || contexto.ocupado} />}
          {no.filhos.length ? <IconButton icon={aberta ? CaretDownIcon : CaretRightIcon} label={aberta ? `Recolher ${no.nome}` : `Expandir ${no.nome}`} variant="ghost" size="sm" tooltip={false} onClick={() => contexto.alternarAberta(no.id)} disabled={contexto.filtrando} /> : <Espaco aria-hidden />}
          <Texto>
            <strong>{no.nome}</strong>
            <Caminho>/{no.caminho}</Caminho>
          </Texto>
          <Selos>
            <Pill $tone="neutral" $outline title="Produtos com esta categoria como principal">{no.produtos} produto{no.produtos === 1 ? "" : "s"}</Pill>
            {!no.ativa && <Pill $tone="yellow">Inativa</Pill>}
            {herdada && <Pill $tone="yellow" title="Uma categoria acima está inativa">Oculta pela mãe</Pill>}
          </Selos>
          <Switch checked={no.ativa} label={no.ativa ? `Desativar ${no.nome}` : `Ativar ${no.nome}`} disabled={!contexto.podeEditar || contexto.ocupado} onChange={() => void contexto.alternar(no)} />
          <Menu label={`Ações de ${no.nome}`} align="end" width="15rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} />}>
            <MenuItem icon={PencilSimpleIcon} onSelect={() => contexto.editar(no)}>{contexto.podeEditar ? "Editar" : "Ver detalhes"}</MenuItem>
            {contexto.podeEditar && <MenuItem icon={FolderSimplePlusIcon} disabled={nivelDe(no.caminho) >= PROFUNDIDADE} meta={nivelDe(no.caminho) >= PROFUNDIDADE ? "limite de 4 níveis" : undefined} onSelect={() => contexto.novaFilha(no)}>Nova subcategoria</MenuItem>}
            <MenuItem icon={ArrowSquareOutIcon} disabled={!no.ativa || herdada} meta={!no.ativa || herdada ? "inativa" : undefined} onSelect={() => window.open(`${contexto.origemLoja}/${no.caminho}`, "_blank", "noopener,noreferrer")}>Ver na loja</MenuItem>
            {contexto.podeEditar && !contexto.filtrando && <>
              <MenuSeparator />
              <MenuItem icon={ArrowUpIcon} disabled={posicao === 0} onSelect={() => { const nova = [...ordem]; [nova[posicao - 1], nova[posicao]] = [nova[posicao], nova[posicao - 1]]; setOrdem(nova); gravar(nova); }}>Mover para cima</MenuItem>
              <MenuItem icon={ArrowDownIcon} disabled={posicao === ordem.length - 1} onSelect={() => { const nova = [...ordem]; [nova[posicao + 1], nova[posicao]] = [nova[posicao], nova[posicao + 1]]; setOrdem(nova); gravar(nova); }}>Mover para baixo</MenuItem>
              <MenuSeparator />
              <MenuItem icon={TrashIcon} muted disabled={no.filhos.length > 0 || no.produtos > 0} meta={no.filhos.length ? "tem subcategorias" : no.produtos ? "tem produtos" : undefined} onSelect={() => contexto.excluir(no)}>Excluir</MenuItem>
            </>}
          </Menu>
        </LinhaNo>
        {no.filhos.length > 0 && aberta && <Irmas nos={no.filhos} paiId={no.id} nivel={nivel + 1} contexto={contexto} />}
      </li>;
    })}
  </Arvore>;
}

/** Criar ou editar uma categoria (janela). */
function EditorCategoria({ edicao, categorias, arvore, onFechar, onSalvo }: { edicao: NonNullable<Edicao>; categorias: CategoriaGestao[]; arvore: NoCategoriaGestao[]; onFechar: () => void; onSalvo: (mensagem: string) => Promise<void> }) {
  const podeEditar = usePodeEditar();
  const atual = edicao.categoria;
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [slug, setSlug] = useState(atual?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(atual));
  const [paiId, setPaiId] = useState<string | null>(edicao.paiId);
  const [descricao, setDescricao] = useState(atual?.descricao ?? "");
  const [imagem, setImagem] = useState(atual?.imagem ?? "");
  const [seoTitulo, setSeoTitulo] = useState(atual?.seoTitulo ?? "");
  const [seoDescricao, setSeoDescricao] = useState(atual?.seoDescricao ?? "");
  const [ativa, setAtiva] = useState(atual?.ativa ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentou, setTentou] = useState(false);

  const trilhas = useMemo(() => trilhasDeCategorias(categorias), [categorias]);
  // A própria e as descendentes não podem ser mães; a mãe precisa caber nos 4 níveis com a subárvore inteira.
  const descendentes = useMemo(() => {
    const ids = new Set<string>();
    const juntar = (nos: NoCategoriaGestao[], dentro: boolean) => nos.forEach((no) => { const agora = dentro || no.id === atual?.id; if (agora) ids.add(no.id); juntar(no.filhos, agora); });
    if (atual) juntar(arvore, false);
    return ids;
  }, [arvore, atual]);
  const alturaSubarvore = atual ? Math.max(1, ...categorias.filter((categoria) => categoria.caminho === atual.caminho || categoria.caminho.startsWith(`${atual.caminho}/`)).map((categoria) => nivelDe(categoria.caminho) - nivelDe(atual.caminho) + 1)) : 1;
  const opcoesMae = [{ value: "", label: "Nenhuma (categoria principal)" }, ...categorias.filter((categoria) => !descendentes.has(categoria.id)).map((categoria) => ({
    value: categoria.id, label: trilhas.get(categoria.id) ?? categoria.nome, keywords: categoria.caminho,
    disabled: nivelDe(categoria.caminho) + alturaSubarvore > PROFUNDIDADE, description: nivelDe(categoria.caminho) + alturaSubarvore > PROFUNDIDADE ? "Passaria do limite de 4 níveis." : undefined,
  }))];
  const mae = categorias.find((categoria) => categoria.id === paiId);
  const caminho = `${mae ? `${mae.caminho}/` : ""}${slug || "…"}`;
  const caminhoMuda = atual && caminho !== atual.caminho;
  const filhas = atual ? categorias.filter((categoria) => categoria.caminho.startsWith(`${atual.caminho}/`)).length : 0;
  const errosCampos = { nome: !nome.trim() ? "Informe o nome." : tamanho(nome.trim()) > 80 ? "Até 80 caracteres." : undefined, slug: !SLUG.test(slug) ? "Letras minúsculas, números e hífens." : undefined };
  const imagemValida = !imagem || (/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|avif)$/.test(imagem) && !imagem.includes(".."));

  async function salvar() {
    setTentou(true);
    if (errosCampos.nome || errosCampos.slug || !imagemValida || tamanho(seoTitulo) > 70 || tamanho(seoDescricao) > 170) return;
    setSalvando(true); setErro("");
    const corpo: EntradaCategoria = { nome: nome.trim(), slug, paiId, descricao: descricao.trim(), imagem, seoTitulo: seoTitulo.trim(), seoDescricao: seoDescricao.trim(), ativa };
    try {
      if (atual) await erpRequest(loja(`categorias/${atual.id}`), { method: "PATCH", body: { revisao: atual.revisao, ...corpo } });
      else await erpRequest(loja("categorias"), { method: "POST", body: corpo });
      await onSalvo(atual ? `“${corpo.nome}” foi salva.${caminhoMuda ? ` Novo endereço: /${caminho}.` : ""}` : `“${corpo.nome}” foi criada em /${caminho}.`);
    } catch (caught) { setErro(conflito(caught) ? "Outra pessoa alterou esta categoria. Feche, atualize a lista e tente de novo." : requestError(caught)); }
    finally { setSalvando(false); }
  }

  return <Dialog open onClose={() => { if (!salvando) onFechar(); }} title={atual ? (podeEditar ? `Editar “${atual.nome}”` : atual.nome) : mae ? `Nova subcategoria em ${mae.nome}` : "Nova categoria"} width="40rem" height="44rem"
    description={<>Endereço na loja: <Caminho>/{caminho}</Caminho></>}
    footer={<><Button variant="ghost" disabled={salvando} onClick={onFechar}>{podeEditar ? "Cancelar" : "Fechar"}</Button>{podeEditar && <Button loading={salvando} onClick={() => void salvar()}>{atual ? "Salvar categoria" : "Criar categoria"}</Button>}</>}>
    <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        {erro && <Notice role="alert">{erro}</Notice>}
        <FieldGrid>
          <TextField label="Nome" value={nome} maxLength={80} error={tentou ? errosCampos.nome : undefined} onChange={(event) => { setNome(event.target.value); if (!slugManual) setSlug(slugificar(event.target.value, 60)); }} placeholder="Ex.: Kits" />
          <TextField label="Slug" value={slug} maxLength={60} error={tentou ? errosCampos.slug : undefined} onChange={(event) => { setSlugManual(true); setSlug(slugificar(event.target.value.replace(/\s/g, "-"), 60) + (event.target.value.endsWith("-") ? "-" : "")); }} hint={slugManual ? "Parte final do endereço." : "Gerado pelo nome."} />
        </FieldGrid>
        <Select label="Categoria-mãe" searchable value={paiId ?? ""} onChange={(valor) => setPaiId(valor || null)} options={opcoesMae} hint="Até 4 níveis. Sem mãe, vira uma categoria principal (endereço na raiz da loja)." />
        {caminhoMuda && <Notice>O endereço muda de <Caminho>/{atual?.caminho}</Caminho> para <Caminho>/{caminho}</Caminho>{filhas ? ` e as ${filhas} subcategorias acompanham` : ""}. Links antigos deixam de abrir.</Notice>}
        <TextField label="Descrição" multiline rows={3} value={descricao} maxLength={2000} onChange={(event) => setDescricao(event.target.value)} hint="Texto do topo da listagem (opcional)." />
        <CampoImagemLoja rotulo="Imagem" valor={imagem} onChange={setImagem} disabled={!podeEditar} />
        <Divider />
        <TextField label="Título para buscadores" value={seoTitulo} onChange={(event) => setSeoTitulo(event.target.value)} placeholder={nome || "Nome da categoria"} error={tamanho(seoTitulo) > 70 ? "Use até 70 caracteres." : undefined} hint={<Contador texto={seoTitulo} limite={70} />} />
        <TextField label="Descrição para buscadores" multiline rows={2} value={seoDescricao} onChange={(event) => setSeoDescricao(event.target.value)} error={tamanho(seoDescricao) > 170 ? "Use até 170 caracteres." : undefined} hint={<Contador texto={seoDescricao} limite={170} />} />
        <ToggleRow title="Ativa na loja" description="Desativada, a listagem e as subcategorias saem da loja; os produtos continuam cadastrados." checked={ativa} onChange={setAtiva} disabled={!podeEditar} />
        {atual && <Sub>{atual.produtos} produto(s) com esta categoria como principal.</Sub>}
      </Stack>
    </fieldset>
  </Dialog>;
}

function Esqueleto() {
  return <Stack role="status" aria-label="Carregando categorias">{Array.from({ length: 6 }, (_, indice) => <Skeleton key={indice} $height="2.75rem" $radius="md" $width={indice % 3 ? "92%" : "100%"} />)}</Stack>;
}

/* ---------- Estilos ---------- */

const Barra = styled.div`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(2)}; align-items: center; > :first-of-type { flex: 1; min-width: 12rem; }`;
const Dica = styled.p`font-size: ${({ theme }) => theme.fontSizes.xs}; color: ${({ theme }) => theme.colors.text.muted};`;

const Arvore = styled("ul", { shouldForwardProp: (prop) => !prop.startsWith("$") })<{ $nivel: number }>`
  display: flex;
  flex-direction: column;
  list-style: none;
  ${({ $nivel, theme }) => ($nivel > 1 ? `margin-left: ${theme.spacing(5)}; padding-left: ${theme.spacing(2)}; border-left: 1px dashed ${theme.colors.border.subtle};` : "")}

  ${({ theme }) => theme.media.sm} { ${({ $nivel, theme }) => ($nivel > 1 ? `margin-left: ${theme.spacing(2)};` : "")} }

  > li[data-arrastando] > div { opacity: 0.45; }
`;

const LinhaNo = styled("div", { shouldForwardProp: (prop) => !prop.startsWith("$") })<{ $inativa: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-height: 3rem;
  padding: ${({ theme }) => theme.spacing(1, 1)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
  strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme, $inativa }) => ($inativa ? theme.colors.text.muted : theme.colors.text.primary)}; }
`;

const Espaco = styled.span`display: inline-block; flex-shrink: 0; width: 1.75rem;`;
const Texto = styled.span`display: flex; flex: 1; flex-direction: column; min-width: 0; font-size: 0.8125rem;`;
const Selos = styled.span`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(1)};

  ${({ theme }) => theme.media.sm} { > :first-of-type { display: none; } }
`;
