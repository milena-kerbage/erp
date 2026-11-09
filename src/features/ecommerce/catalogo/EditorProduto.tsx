"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import {
  ArchiveIcon, ArrowCounterClockwiseIcon, ArrowLeftIcon, ArrowSquareOutIcon, ArrowUpIcon, CopyIcon, CurrencyCircleDollarIcon, DotsThreeIcon, FloppyDiskIcon, GearSixIcon, ImagesIcon,
  InfoIcon, LinkSimpleIcon, ListBulletsIcon, MagnifyingGlassIcon, NeedleIcon, PackageIcon, PlusIcon, RocketLaunchIcon, SlidersHorizontalIcon, SquaresFourIcon, TableIcon, TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextField } from "@/components/ui/TextField";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Card, FieldGrid, Notice, Page, PageHeader, Pill } from "@/features/operations/components/ui";
import { Divider, SaveBar, ToggleRow } from "@/features/settings/components/ui";
import { renderIcon, type IconSource } from "@/lib/icons";
import type {
  ColecaoGestao, Disponibilidade, EntradaProduto, GrupoOpcoesComUso, ProdutoGestao, ReferenciaProduto, RespostaCategorias, RespostaImagensProduto, StatusProduto,
} from "@/features/ecommerce/types";
import {
  condicoesDaLoja, conflito, dataHora, DISPONIBILIDADE, erpRequest, loja, reais, requestError, SLUG, slugificar, STATUS_PRODUTO, tamanho, trilhasDeCategorias,
} from "./api";
import { AcoesCabecalho, Atencao, AvisoSomenteLeitura, CampoReais, Confirmar, Contador, Linha, Sub, useAvisoAoSair, usePodeEditar, useRecurso } from "./comum";
import { ListaProdutos } from "./editor/BuscaProduto";
import { FotosProduto } from "./editor/FotosProduto";
import { ListaTextos, novaChave, paraItens, type ItemTexto } from "./editor/ListaTextos";

/* ---------- Formulário ---------- */

type LinhaFicha = { id: string; rotulo: string; valor: string };
type GrupoFicha = { id: string; titulo: string; itens: LinhaFicha[] };
type Atributo = { id: string; chave: string; valores: string };
type Formulario = {
  nome: string; slug: string; sku: string; marca: string; resumo: string; descricao: ItemTexto[];
  preco: number | null; precoDe: number | null; unidade: string;
  status: StatusProduto; disponibilidade: Disponibilidade; prazoMin: string; prazoMax: string;
  categoriaId: string; categoriasExtras: string[]; selo: string; destaque: boolean; linhaCores: string; cor: string; atributos: Atributo[];
  grupos: string[]; pecas: ItemTexto[]; personalizacao: string; ficha: GrupoFicha[];
  complementos: ReferenciaProduto[]; semelhantes: ReferenciaProduto[]; seoTitulo: string; seoDescricao: string;
};
type Erros = Partial<Record<string, string>>;

const SKU = /^[A-Z0-9][A-Z0-9._-]{0,39}$/;
const CHAVE_ATRIBUTO = /^[a-z][a-z0-9]{0,29}$/;
const CHAVES_SUGERIDAS = ["cor", "tecido", "estilo", "tamanho", "para", "tema", "personalizacao"];

function formularioDe(produto?: ProdutoGestao): Formulario {
  return {
    nome: produto?.nome ?? "", slug: produto?.slug ?? "", sku: produto?.sku ?? "", marca: produto?.marca ?? "Milena Kerbage", resumo: produto?.resumo ?? "",
    descricao: paraItens(produto?.descricao ?? []), preco: produto?.precoCentavos ?? null, precoDe: produto?.precoDeCentavos ?? null, unidade: produto?.unidade ?? "peça",
    status: produto?.status ?? "rascunho", disponibilidade: produto?.disponibilidade ?? "sob_encomenda",
    prazoMin: produto?.prazoMinDias === null || produto?.prazoMinDias === undefined ? "" : String(produto.prazoMinDias),
    prazoMax: produto?.prazoMaxDias === null || produto?.prazoMaxDias === undefined ? "" : String(produto.prazoMaxDias),
    categoriaId: produto?.categoriaId ?? "", categoriasExtras: produto?.categoriasExtras ?? [], selo: produto?.selo ?? "", destaque: produto?.destaque ?? false,
    linhaCores: produto?.linhaCores ?? "", cor: produto?.cor ?? "",
    atributos: Object.entries(produto?.atributos ?? {}).map(([chave, valores]) => ({ id: novaChave(), chave, valores: valores.join(", ") })),
    grupos: (produto?.grupos ?? []).map((grupo) => grupo.grupoId), pecas: paraItens(produto?.pecas ?? []), personalizacao: produto?.personalizacao ?? "",
    ficha: (produto?.ficha ?? []).map((grupo) => ({ id: novaChave(), titulo: grupo.titulo, itens: grupo.itens.map(([rotulo, valor]) => ({ id: novaChave(), rotulo, valor })) })),
    complementos: produto?.complementos ?? [], semelhantes: produto?.semelhantes ?? [], seoTitulo: produto?.seoTitulo ?? "", seoDescricao: produto?.seoDescricao ?? "",
  };
}

const valores = (texto: string) => [...new Set(texto.split(",").map((valor) => valor.trim()).filter(Boolean))];
const prazo = (texto: string) => (texto.trim() === "" ? null : Number(texto));

/** O que vai para a API (mesma forma de EntradaProduto). */
function corpoDe(form: Formulario): EntradaProduto {
  return {
    nome: form.nome.trim(), slug: form.slug.trim(), sku: form.sku.trim().toUpperCase(), marca: form.marca.trim() || "Milena Kerbage", resumo: form.resumo.trim(),
    descricao: form.descricao.map((item) => item.texto.trim()).filter(Boolean), precoCentavos: form.preco ?? undefined, precoDeCentavos: form.precoDe, unidade: form.unidade.trim() || "peça",
    status: form.status, disponibilidade: form.disponibilidade, prazoMinDias: prazo(form.prazoMin), prazoMaxDias: prazo(form.prazoMax),
    categoriaId: form.categoriaId, categoriasExtras: form.categoriasExtras.filter((extra) => extra !== form.categoriaId), selo: form.selo.trim(), destaque: form.destaque,
    linhaCores: form.linhaCores.trim(), cor: form.cor.trim(),
    atributos: Object.fromEntries(form.atributos.filter((atributo) => atributo.chave.trim()).map((atributo) => [atributo.chave.trim(), valores(atributo.valores)])),
    grupos: form.grupos, pecas: form.pecas.map((item) => item.texto.trim()).filter(Boolean), personalizacao: form.personalizacao.trim(),
    ficha: form.ficha.map((grupo) => ({ titulo: grupo.titulo.trim(), itens: grupo.itens.filter((item) => item.rotulo.trim() || item.valor.trim()).map((item): [string, string] => [item.rotulo.trim(), item.valor.trim()]) }))
      .filter((grupo) => grupo.titulo || grupo.itens.length),
    complementos: form.complementos.map((item) => item.id), semelhantes: form.semelhantes.map((item) => item.id), seoTitulo: form.seoTitulo.trim(), seoDescricao: form.seoDescricao.trim(),
  };
}

/** As mesmas regras do backend, antes de enviar (o servidor confere de novo). */
function validar(form: Formulario, grupos: readonly GrupoOpcoesComUso[]): Erros {
  const erros: Erros = {};
  const corpo = corpoDe(form);
  if (!corpo.nome) erros.nome = "Informe o nome do produto.";
  else if (tamanho(corpo.nome) > 160) erros.nome = "Use até 160 caracteres.";
  if (!corpo.slug || !SLUG.test(corpo.slug)) erros.slug = "Use letras minúsculas, números e hífens (ex.: kit-berco-jardim).";
  if (!SKU.test(corpo.sku ?? "")) erros.sku = "Letras maiúsculas, números, ponto, hífen ou sublinhado (ex.: MK-1001).";
  if (form.preco === null) erros.preco = "Informe o preço “a partir de”.";
  if (form.precoDe !== null && form.preco !== null && form.precoDe <= form.preco) erros.precoDe = "O preço “de” precisa ser maior que o preço.";
  if (!corpo.categoriaId) erros.categoriaId = "Escolha a categoria principal.";
  const [minimo, maximo] = [prazo(form.prazoMin), prazo(form.prazoMax)];
  if ((minimo === null) !== (maximo === null)) erros.prazo = "Informe o prazo mínimo e o máximo juntos (ou deixe os dois vazios).";
  else if (minimo !== null && maximo !== null) {
    if (![minimo, maximo].every((dias) => Number.isInteger(dias) && dias >= 0 && dias <= 365)) erros.prazo = "Prazo em dias úteis, de 0 a 365.";
    else if (minimo > maximo) erros.prazo = "O prazo mínimo não pode passar do máximo.";
  }
  if (corpo.linhaCores && !SLUG.test(corpo.linhaCores)) erros.linhaCores = "Identificador em minúsculas com hífens (ex.: kit-berco-jardim).";
  if (corpo.linhaCores && !corpo.cor) erros.cor = "Informe a cor desta peça.";
  const chaves = form.atributos.map((atributo) => atributo.chave.trim()).filter(Boolean);
  for (const atributo of form.atributos) {
    const chave = atributo.chave.trim();
    if (!chave && !atributo.valores.trim()) continue;
    if (!CHAVE_ATRIBUTO.test(chave)) erros[`atributo-${atributo.id}`] = "Faceta: letras minúsculas e números, sem espaço (ex.: cor, tecido).";
    else if (chave === "entrega" || chave === "retirada") erros[`atributo-${atributo.id}`] = "“entrega” e “retirada” vêm da disponibilidade.";
    else if (chaves.filter((outra) => outra === chave).length > 1) erros[`atributo-${atributo.id}`] = "Faceta repetida.";
    else if (!valores(atributo.valores).length) erros[`atributo-${atributo.id}`] = "Informe pelo menos um valor.";
    else if (valores(atributo.valores).some((valor) => tamanho(valor) > 60) || valores(atributo.valores).length > 20) erros[`atributo-${atributo.id}`] = "Até 20 valores de até 60 caracteres.";
  }
  const tipos = form.grupos.map((id) => grupos.find((grupo) => grupo.id === id)?.tipo);
  if (tipos.filter((tipo) => tipo === "escolha").length > 1 || tipos.filter((tipo) => tipo === "personalizacao").length > 1) erros.grupos = "Use no máximo um grupo de escolha e um de personalização.";
  for (const grupo of corpo.ficha ?? []) {
    if (!grupo.titulo) erros.ficha = "Cada grupo da ficha precisa de um título.";
    if (grupo.itens.some(([rotulo, valor]) => !rotulo || !valor)) erros.ficha = "Preencha o rótulo e o valor de cada linha da ficha.";
  }
  if (tamanho(corpo.resumo ?? "") > 500) erros.resumo = "Use até 500 caracteres.";
  if (tamanho(corpo.seoTitulo ?? "") > 70) erros.seoTitulo = "Use até 70 caracteres.";
  if (tamanho(corpo.seoDescricao ?? "") > 170) erros.seoDescricao = "Use até 170 caracteres.";
  return erros;
}

const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- Tela ---------- */

/**
 * Cadastro e edição de um produto da loja, por seções. "Salvar" grava tudo de uma vez (com a revisão,
 * para não sobrescrever a edição de outra pessoa); as fotos gravam na hora. Com alterações não salvas,
 * a barra de salvar aparece e sair da tela pede confirmação.
 */
export function EditorProduto({ id, origemLoja, copia = false, criado = false }: { id: string | null; origemLoja: string; copia?: boolean; criado?: boolean }) {
  const router = useRouter();
  const podeEditar = usePodeEditar();
  const categorias = useRecurso<RespostaCategorias>(loja("categorias"));
  const grupos = useRecurso<{ grupos: GrupoOpcoesComUso[] }>(loja("opcoes"));
  const colecoes = useRecurso<{ colecoes: ColecaoGestao[] }>(loja("colecoes"));
  const [produto, setProduto] = useState<ProdutoGestao | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [inicial, setInicial] = useState<Formulario>(() => formularioDe());
  const [form, setForm] = useState<Formulario>(inicial);
  const [colecoesEscolhidas, setColecoesEscolhidas] = useState<string[] | null>(null);
  const [slugManual, setSlugManual] = useState(Boolean(id));
  const [carregando, setCarregando] = useState(Boolean(id));
  const [erroCarga, setErroCarga] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState(copia ? "Cópia criada como rascunho, com as fotos e as opções. Troque o nome, o slug e o SKU antes de publicar." : criado ? "Produto criado. Agora dá para enviar as fotos; ele só entra na loja quando a situação for “Ativo”." : "");
  const [erros, setErros] = useState<Erros>({});
  const [desatualizado, setDesatualizado] = useState(false);
  const [confirmar, setConfirmar] = useState<"arquivar" | "excluir" | "recarregar" | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const aplicarProduto = useCallback((novo: ProdutoGestao) => {
    const base = formularioDe(novo);
    setProduto(novo); setRevisao(novo.revisao); setInicial(base); setForm(base); setSlugManual(true); setErros({}); setDesatualizado(false);
  }, []);
  const carregar = useCallback(async (signal?: AbortSignal) => {
    if (!id) return;
    setCarregando(true); setErroCarga("");
    try { aplicarProduto((await erpRequest<{ produto: ProdutoGestao }>(loja(`produtos/${id}`), { signal })).produto); }
    catch (caught) { if (!signal?.aborted) setErroCarga(requestError(caught)); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }, [id, aplicarProduto]);
  useEffect(() => { const controle = new AbortController(); void carregar(controle.signal); return () => controle.abort(); }, [carregar]);

  const listaGrupos = grupos.dados?.grupos ?? [];
  const listaColecoes = colecoes.dados?.colecoes ?? [];
  const colecoesBase = useMemo(() => (id ? listaColecoes.filter((colecao) => colecao.produtos.some((item) => item.id === id)).map((colecao) => colecao.id) : []), [listaColecoes, id]);
  const colecoesAtuais = colecoesEscolhidas ?? colecoesBase;
  const sujo = !iguais(corpoDe(form), corpoDe(inicial)) || !iguais([...colecoesAtuais].sort(), [...colecoesBase].sort());
  const { janela: avisoSaida, liberar } = useAvisoAoSair(sujo && podeEditar);

  const mudar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo as string]) setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  };
  const mudarNome = (nome: string) => setForm((atual) => ({ ...atual, nome, ...(slugManual ? {} : { slug: slugificar(nome) }) }));

  async function sincronizarColecoes(produtoId: string, referencia: ReferenciaProduto) {
    const falhas: string[] = [];
    for (const colecao of listaColecoes) {
      const tem = colecao.produtos.some((item) => item.id === produtoId), quer = colecoesAtuais.includes(colecao.id);
      if (tem === quer) continue;
      const produtos = quer ? [...colecao.produtos.map((item) => item.id), referencia.id] : colecao.produtos.filter((item) => item.id !== produtoId).map((item) => item.id);
      try { await erpRequest(loja(`colecoes/${colecao.id}`), { method: "PATCH", body: { revisao: colecao.revisao, produtos } }); }
      catch (caught) { falhas.push(`${colecao.nome}: ${requestError(caught)}`); }
    }
    return falhas;
  }

  async function salvar() {
    if (!podeEditar || salvando) return;
    const encontrados = validar(form, listaGrupos);
    setErros(encontrados);
    if (Object.values(encontrados).some(Boolean)) {
      setErro("Confira os campos destacados antes de salvar.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [data-erro]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setSalvando(true); setErro(""); setAviso("");
    try {
      const corpo = corpoDe(form);
      const salvo = id
        ? (await erpRequest<{ produto: ProdutoGestao }>(loja(`produtos/${id}`), { method: "PATCH", body: { revisao, ...corpo } })).produto
        : (await erpRequest<{ produto: ProdutoGestao }>(loja("produtos"), { method: "POST", body: corpo })).produto;
      const falhas = await sincronizarColecoes(salvo.id, salvo);
      setColecoesEscolhidas(null);
      await colecoes.recarregar();
      liberar();
      if (!id) {
        setInicial(form);
        startNavigationProgress();
        router.replace(`/ecommerce/produtos/${salvo.id}${falhas.length ? "" : "?criado=1"}`);
        return;
      }
      aplicarProduto(salvo);
      setAviso(falhas.length ? "" : salvo.status === "ativo" ? "Alterações salvas. A loja já mostra a versão nova." : "Alterações salvas.");
      if (falhas.length) setErro(`Produto salvo, mas algumas coleções não foram atualizadas: ${falhas.join(" · ")}`);
    } catch (caught) {
      if (conflito(caught)) setDesatualizado(true);
      setErro(requestError(caught));
    } finally { setSalvando(false); }
  }

  async function arquivarOuExcluir(tipo: "arquivar" | "excluir") {
    if (!produto) return;
    setOcupado(true); setErro("");
    try {
      if (tipo === "arquivar") { aplicarProduto((await erpRequest<{ produto: ProdutoGestao }>(loja(`produtos/${produto.id}/arquivar`), { method: "POST", body: { revisao } })).produto); setAviso("Produto arquivado: saiu da loja."); }
      else { await erpRequest(loja(`produtos/${produto.id}?revisao=${revisao}`), { method: "DELETE" }); liberar(); startNavigationProgress(); router.replace("/ecommerce/produtos"); }
      setConfirmar(null);
    } catch (caught) { if (conflito(caught)) setDesatualizado(true); setErro(requestError(caught)); setConfirmar(null); }
    finally { setOcupado(false); }
  }
  async function duplicar() {
    if (!produto) return;
    setOcupado(true); setErro("");
    try { const { produto: nova } = await erpRequest<{ produto: ProdutoGestao }>(loja(`produtos/${produto.id}/duplicar`), { method: "POST", body: {} }); startNavigationProgress(); router.push(`/ecommerce/produtos/${nova.id}?copia=1`); }
    catch (caught) { setErro(requestError(caught)); setOcupado(false); }
  }

  const listaCategorias = categorias.dados?.categorias ?? [];
  const trilhas = useMemo(() => trilhasDeCategorias(listaCategorias), [listaCategorias]);
  const opcoesCategoria = listaCategorias.map((categoria) => ({ value: categoria.id, label: trilhas.get(categoria.id) ?? categoria.nome, meta: categoria.ativa ? undefined : "inativa", keywords: categoria.caminho }));
  const categoriaPrincipal = listaCategorias.find((categoria) => categoria.id === form.categoriaId);
  const condicoes = form.preco !== null ? condicoesDaLoja(form.preco) : null;
  const gruposLigados = form.grupos.map((grupoId) => listaGrupos.find((grupo) => grupo.id === grupoId)).filter((grupo): grupo is GrupoOpcoesComUso => Boolean(grupo));
  const temPersonalizacao = gruposLigados.some((grupo) => grupo.tipo === "personalizacao");
  const urlLoja = produto ? `${origemLoja}/produto/${produto.slug}` : "";

  if (id && carregando && !produto) return <Page><PageHeader title="Carregando produto…" description="Buscando o cadastro no banco do ateliê." /><Card><Skeleton $width="40%" /><Skeleton $height="2.25rem" /><Skeleton $height="6rem" /></Card></Page>;
  if (id && !produto) return <Page><PageHeader title="Produto" description="Não foi possível abrir este produto." /><Notice role="alert">{erroCarga || "Produto não encontrado."} <Button variant="ghost" size="sm" onClick={() => void carregar()}>Tentar novamente</Button></Notice><Button variant="secondary" icon={ArrowLeftIcon} href="/ecommerce/produtos">Voltar aos produtos</Button></Page>;

  const titulo = form.nome.trim() || (id ? "Produto sem nome" : "Novo produto");
  return <Page>
    <PageHeader title={titulo} description={id && produto ? `${STATUS_PRODUTO[produto.status].rotulo} · SKU ${produto.sku} · salvo em ${dataHora(produto.atualizadoEm)}` : "Cadastro novo: nasce como rascunho (fora da loja) até você publicar."}
      actions={<AcoesCabecalho>
        <Button variant="ghost" icon={ArrowLeftIcon} href="/ecommerce/produtos">Produtos</Button>
        {produto?.status === "ativo" && !sujo && <Button variant="secondary" icon={ArrowSquareOutIcon} href={urlLoja} target="_blank" rel="noopener noreferrer">Ver na loja</Button>}
        {produto && podeEditar && <Menu label="Mais ações do produto" align="end" width="15rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Mais ações" tooltip={false} disabled={ocupado} />}>
          <MenuItem icon={CopyIcon} onSelect={() => void duplicar()} disabled={sujo} meta={sujo ? "salve antes" : undefined}>Duplicar como rascunho</MenuItem>
          {produto.status === "ativo" && <MenuItem icon={ArchiveIcon} onSelect={() => setConfirmar("arquivar")} disabled={sujo} meta={sujo ? "salve antes" : undefined}>Arquivar (tirar da loja)</MenuItem>}
          <MenuSeparator />
          <MenuItem icon={TrashIcon} muted disabled={produto.status === "ativo"} meta={produto.status === "ativo" ? "arquive antes" : undefined} onSelect={() => setConfirmar("excluir")}>Excluir definitivamente</MenuItem>
        </Menu>}
        {podeEditar && <Button icon={FloppyDiskIcon} loading={salvando} disabled={!sujo && Boolean(id)} onClick={() => void salvar()}>{id ? "Salvar" : "Salvar produto"}</Button>}
      </AcoesCabecalho>} />

    {!podeEditar && <AvisoSomenteLeitura oque="os produtos" />}
    {desatualizado && <Notice role="alert">Outra pessoa salvou este produto enquanto você editava. Recarregue para ver a versão atual (as suas alterações desta tela serão descartadas). <Button size="sm" variant="secondary" icon={ArrowCounterClockwiseIcon} onClick={() => setConfirmar("recarregar")}>Recarregar produto</Button></Notice>}
    {erro && !desatualizado && <Notice role="alert">{erro}</Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}

    <Atalhos aria-label="Seções do produto">
      {SECOES.map((secao) => <a key={secao.id} href={`#${secao.id}`} onClick={(event) => { event.preventDefault(); document.getElementById(secao.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{secao.rotulo}</a>)}
    </Atalhos>

    <Corpo disabled={!podeEditar}>
      <Secao id="informacoes" titulo="Informações" icone={InfoIcon} descricao="Nome, endereço da página e textos. O slug vira o endereço /produto/<slug> e o SKU identifica a peça nos pedidos.">
        <TextField label="Nome" value={form.nome} maxLength={160} required error={erros.nome} onChange={(event) => mudarNome(event.target.value)} placeholder="Ex.: Kit berço Jardim rosê" />
        <FieldGrid>
          <TextField label="Slug (endereço na loja)" value={form.slug} maxLength={120} error={erros.slug} onChange={(event) => { setSlugManual(true); mudar("slug", slugificar(event.target.value.replace(/\s/g, "-"), 120) + (event.target.value.endsWith("-") ? "-" : "")); }}
            hint={<>/produto/{form.slug || "…"}{!slugManual && " · gerado pelo nome"}{slugManual && !id && <> · <LinkBotao type="button" onClick={() => { setSlugManual(false); mudar("slug", slugificar(form.nome)); }}>gerar pelo nome</LinkBotao></>}{id && produto && form.slug !== produto.slug && " · trocar o slug muda o endereço (links antigos deixam de abrir)"}</>} />
          <TextField label="SKU" value={form.sku} maxLength={40} error={erros.sku} placeholder="MK-1001" onChange={(event) => mudar("sku", event.target.value.toUpperCase().replace(/\s/g, "-"))} hint="Código da peça (maiúsculas, números, - . _)." />
        </FieldGrid>
        <TextField label="Resumo" multiline rows={2} value={form.resumo} maxLength={500} error={erros.resumo} onChange={(event) => mudar("resumo", event.target.value)} hint={<Contador texto={form.resumo} limite={500} ideal="aparece perto do preço" />} />
        <Campo rotulo="Descrição (parágrafos)" dica="Cada parágrafo aparece separado na página. Até 10.">
          <ListaTextos itens={form.descricao} onChange={(itens) => mudar("descricao", itens)} rotulo="Parágrafo" maximo={10} maximoTexto={2000} multilinha adicionar="Adicionar parágrafo" disabled={!podeEditar} placeholder="Conte o que torna a peça especial…" />
        </Campo>
        <TextField label="Marca" value={form.marca} maxLength={80} onChange={(event) => mudar("marca", event.target.value)} hint="Padrão: Milena Kerbage." />
      </Secao>

      <Secao id="preco" titulo="Preço" icone={CurrencyCircleDollarIcon} descricao="O preço é “a partir de”: o valor final, o frete e o pagamento são combinados pelo WhatsApp. O Pix tem 5% OFF.">
        <FieldGrid>
          <CampoReais rotulo="Preço (a partir de)" valor={form.preco} erro={erros.preco} onChange={(valor) => mudar("preco", valor)} />
          <CampoReais rotulo="Preço “de” (opcional)" valor={form.precoDe} erro={erros.precoDe} onChange={(valor) => mudar("precoDe", valor)} dica="Preço antigo, riscado. Precisa ser maior que o preço." placeholder="Sem preço antigo" />
          <TextField label="Unidade" value={form.unidade} maxLength={60} onChange={(event) => mudar("unidade", event.target.value)} hint="Ex.: peça, kit, par, jogo." />
        </FieldGrid>
        <Previa aria-label="Prévia do preço na loja">
          <small>Prévia na página do produto</small>
          {condicoes && form.preco !== null ? <>
            <p>{form.precoDe !== null && form.precoDe > form.preco && <s>{reais(form.precoDe)}</s>} <span>a partir de</span> <strong>{reais(form.preco)}</strong> <span>/ {form.unidade || "peça"}</span></p>
            <p><b>{reais(condicoes.pix)}</b> no Pix ({condicoes.desconto}% OFF){condicoes.parcelas > 1 ? ` · ou até ${condicoes.parcelas}x de ${reais(condicoes.valorParcela)}` : ""}</p>
            <Sub>Frete a consultar · pedido finalizado pelo WhatsApp com a vendedora.</Sub>
          </> : <Sub>Informe o preço para ver a prévia.</Sub>}
        </Previa>
      </Secao>

      <Secao id="publicacao" titulo="Publicação e entrega" icone={RocketLaunchIcon} descricao="Só os produtos ativos aparecem na loja. Pronta entrega mostra o selo e libera a retirada no ateliê.">
        <FieldGrid>
          <Select label="Situação" value={form.status} onChange={(valor) => mudar("status", valor)} options={(Object.keys(STATUS_PRODUTO) as StatusProduto[]).map((status) => ({ value: status, label: STATUS_PRODUTO[status].rotulo, description: STATUS_PRODUTO[status].descricao }))} />
          <Select label="Disponibilidade" value={form.disponibilidade} onChange={(valor) => mudar("disponibilidade", valor)} options={(Object.keys(DISPONIBILIDADE) as Disponibilidade[]).map((valor) => ({ value: valor, label: DISPONIBILIDADE[valor] }))} />
        </FieldGrid>
        <FieldGrid>
          <TextField label="Prazo de produção mínimo (dias úteis)" inputMode="numeric" value={form.prazoMin} error={erros.prazo ? " " : undefined} onChange={(event) => mudar("prazoMin", event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Padrão da loja" />
          <TextField label="Prazo máximo (dias úteis)" inputMode="numeric" value={form.prazoMax} error={erros.prazo} onChange={(event) => mudar("prazoMax", event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Padrão da loja" hint="Vazio: o prazo padrão da loja (pronta entrega 1 a 2 dias; sob encomenda 15 a 25)." />
        </FieldGrid>
        {form.status === "ativo" && !form.preco && <Atencao>Produto ativo precisa de preço para aparecer certo na loja.</Atencao>}
      </Secao>

      <Secao id="fotos" titulo="Fotos" icone={ImagesIcon} descricao="A 1ª foto é a capa (card e listagem). As fotos gravam na hora, fora do “Salvar”. Texto alternativo ajuda na busca e na acessibilidade.">
        {produto ? <FotosProduto produtoId={produto.id} nome={produto.nome} imagens={produto.imagens} revisao={revisao} podeEditar={podeEditar}
          onAtualizar={(resposta: RespostaImagensProduto) => { setRevisao(resposta.revisao); setProduto((atual) => (atual ? { ...atual, imagens: resposta.imagens, revisao: resposta.revisao } : atual)); }} />
          : <Vazio><Sub>Salve o produto (ele nasce como rascunho) para enviar as fotos.</Sub>{podeEditar && <Button size="sm" variant="secondary" icon={FloppyDiskIcon} loading={salvando} onClick={() => void salvar()}>Salvar rascunho agora</Button>}</Vazio>}
      </Secao>

      <Secao id="organizacao" titulo="Organização" icone={SquaresFourIcon} descricao="Onde o produto aparece: a categoria principal define a trilha e o endereço da listagem; as extras e as coleções o mostram em outras vitrines.">
        <Select label="Categoria principal" required searchable placeholder="Escolher categoria" value={form.categoriaId || null} onChange={(valor) => mudar("categoriaId", valor)} options={opcoesCategoria} hint={(categoriaPrincipal ? `Listagem: /${categoriaPrincipal.caminho}${categoriaPrincipal.ativa ? "" : " (categoria inativa: o produto não aparece nela)"}` : undefined)} />
        {erros.categoriaId && <ErroTexto data-erro>{erros.categoriaId}</ErroTexto>}
        <Select label="Categorias extras" multiple searchable placeholder="Nenhuma" maxChips={3} value={form.categoriasExtras.filter((extra) => extra !== form.categoriaId)} onChange={(valor) => mudar("categoriasExtras", valor.slice(0, 10))}
          options={opcoesCategoria.filter((opcao) => opcao.value !== form.categoriaId)} hint="Até 10. O produto também aparece nessas listagens." />
        <Select label="Coleções" multiple searchable placeholder={colecoes.carregando ? "Carregando…" : listaColecoes.length ? "Nenhuma" : "Nenhuma coleção cadastrada"} maxChips={3} value={colecoesAtuais} onChange={setColecoesEscolhidas}
          options={listaColecoes.map((colecao) => ({ value: colecao.id, label: colecao.nome, meta: colecao.ativa ? undefined : "inativa" }))} hint="Entra no fim da coleção; a ordem fica em E-commerce › Coleções." />
        <Divider />
        <FieldGrid>
          <TextField label="Selo (opcional)" value={form.selo} maxLength={40} onChange={(event) => mudar("selo", event.target.value)} placeholder="Ex.: Novidade" hint="Etiqueta curta no card." />
          <div><ToggleRow title="Destaque" description="Aparece primeiro nas vitrines automáticas." checked={form.destaque} onChange={(valor) => mudar("destaque", valor)} disabled={!podeEditar} /></div>
        </FieldGrid>
        <FieldGrid>
          <TextField label="Linha de cores (opcional)" value={form.linhaCores} maxLength={80} error={erros.linhaCores} onChange={(event) => mudar("linhaCores", event.target.value.toLowerCase().replace(/\s/g, "-"))} placeholder="kit-berco-jardim" hint="Produtos com a mesma linha aparecem como “outras cores”." />
          <TextField label="Cor desta peça" value={form.cor} maxLength={40} error={erros.cor} onChange={(event) => mudar("cor", event.target.value)} placeholder="Ex.: Rosê" />
        </FieldGrid>
        <Campo rotulo="Atributos (filtros da listagem)" dica="Cada faceta vira um filtro na listagem (ex.: cor: Rosê, Off-white). Separe os valores por vírgula. “Entrega” vem da disponibilidade.">
          <Atributos>
            {form.atributos.map((atributo) => <div key={atributo.id}>
              <TextField label="Faceta" value={atributo.chave} maxLength={30} placeholder="cor" list="facetas-sugeridas" error={erros[`atributo-${atributo.id}`] ? " " : undefined}
                onChange={(event) => mudar("atributos", form.atributos.map((outro) => (outro.id === atributo.id ? { ...outro, chave: event.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") } : outro)))} />
              <TextField label="Valores" value={atributo.valores} placeholder="Rosê, Off-white" error={erros[`atributo-${atributo.id}`]}
                onChange={(event) => mudar("atributos", form.atributos.map((outro) => (outro.id === atributo.id ? { ...outro, valores: event.target.value } : outro)))} />
              <IconButton icon={TrashIcon} label="Remover faceta" variant="ghost" size="sm" tooltip="left" onClick={() => mudar("atributos", form.atributos.filter((outro) => outro.id !== atributo.id))} />
            </div>)}
            <datalist id="facetas-sugeridas">{CHAVES_SUGERIDAS.map((chave) => <option key={chave} value={chave} />)}</datalist>
            <Button variant="ghost" size="sm" icon={PlusIcon} disabled={form.atributos.length >= 20} onClick={() => mudar("atributos", [...form.atributos, { id: novaChave(), chave: "", valores: "" }])}>Adicionar faceta</Button>
          </Atributos>
        </Campo>
      </Secao>

      <Secao id="opcoes" titulo="Opções" icone={SlidersHorizontalIcon} descricao="Grupos reaproveitáveis cadastrados em E-commerce › Opções: o seletor obrigatório (ex.: tamanho do berço) e a personalização (com/sem bordado), com o acréscimo de cada opção.">
        <Atencao>A página do produto mostra <strong>1 grupo de escolha</strong> (seletor) e <strong>1 de personalização</strong> (com/sem bordado). Os demais ficariam sem uso.</Atencao>
        {erros.grupos && <ErroTexto data-erro>{erros.grupos}</ErroTexto>}
        {gruposLigados.length ? <GruposLigados>{gruposLigados.map((grupo, posicao) => <li key={grupo.id}>
          <div>
            <Linha><strong>{grupo.nome}</strong><Pill $tone={grupo.tipo === "escolha" ? "blue" : "rose"}>{grupo.tipo === "escolha" ? "Escolha" : "Personalização"}</Pill>{grupo.minimo > 0 && <Pill $tone="neutral" $outline>Obrigatório</Pill>}</Linha>
            <Sub>{grupo.opcoes.map((opcao) => `${opcao.rotulo}${opcao.acrescimoCentavos ? ` (+${reais(opcao.acrescimoCentavos)})` : ""}${opcao.disponivel ? "" : " · indisponível"}`).join(" · ")}</Sub>
          </div>
          <Linha>
            <IconButton icon={ArrowUpIcon} label="Mover para cima" variant="ghost" size="sm" tooltip="top" disabled={posicao === 0} onClick={() => mudar("grupos", [...form.grupos.slice(0, posicao - 1), form.grupos[posicao], form.grupos[posicao - 1], ...form.grupos.slice(posicao + 1)])} />
            <IconButton icon={TrashIcon} label={`Desvincular ${grupo.nome}`} variant="ghost" size="sm" tooltip="top" onClick={() => mudar("grupos", form.grupos.filter((outro) => outro !== grupo.id))} />
          </Linha>
        </li>)}</GruposLigados> : <Sub>Nenhum grupo de opções: o produto vai para a sacola sem escolha.</Sub>}
        <Linha>
          <Select label="Vincular grupo de opções" placeholder="Vincular grupo" searchable value={null} onChange={(valor) => mudar("grupos", [...form.grupos, valor])}
            options={listaGrupos.filter((grupo) => !form.grupos.includes(grupo.id)).map((grupo) => {
              const ocupado = gruposLigados.some((ligado) => ligado.tipo === grupo.tipo);
              return { value: grupo.id, label: grupo.nome, meta: grupo.tipo === "escolha" ? "escolha" : "personalização", description: ocupado ? `Já há um grupo de ${grupo.tipo === "escolha" ? "escolha" : "personalização"} neste produto.` : `${grupo.opcoes.length} opção(ões)`, disabled: ocupado };
            })}
            trigger={({ open: _open, ...props }) => <Button size="sm" variant="secondary" icon={PlusIcon} disabled={!podeEditar || form.grupos.length >= 2} {...props}>Vincular grupo</Button>} />
          <Button size="sm" variant="ghost" icon={GearSixIcon} href="/ecommerce/opcoes">Gerenciar opções</Button>
        </Linha>
      </Secao>

      <Secao id="kit" titulo="Kit e peças" icone={PackageIcon} descricao="Para kits: o que vem dentro, na ordem da lista. Aparece na página do produto.">
        <ListaTextos itens={form.pecas} onChange={(itens) => mudar("pecas", itens)} rotulo="Peça" maximo={30} maximoTexto={200} adicionar="Adicionar peça" placeholder="Ex.: 1 protetor de berço 4 lados" disabled={!podeEditar} />
      </Secao>

      <Secao id="personalizacao" titulo="Personalização" icone={NeedleIcon} descricao="O texto do “com/sem bordado” na página. O acréscimo vem da opção do grupo de personalização vinculado em Opções.">
        <TextField label="Texto da personalização" value={form.personalizacao} maxLength={300} onChange={(event) => mudar("personalizacao", event.target.value)} placeholder="Ex.: Bordado com o nome do bebê"
          hint={<Contador texto={form.personalizacao} limite={300} />} />
        {form.personalizacao.trim() && !temPersonalizacao && <Atencao>Sem grupo de personalização vinculado, o bordado não soma acréscimo ao preço. Vincule um em Opções (ex.: “Bordado com nome”).</Atencao>}
        {!form.personalizacao.trim() && temPersonalizacao && <Atencao>Há um grupo de personalização vinculado, mas sem este texto a página não oferece o bordado.</Atencao>}
      </Secao>

      <Secao id="ficha" titulo="Ficha técnica" icone={TableIcon} descricao="Grupos com pares rótulo/valor (ex.: Tecido › Composição: 100% algodão).">
        {erros.ficha && <ErroTexto data-erro>{erros.ficha}</ErroTexto>}
        {form.ficha.map((grupo, indice) => <GrupoFichaCaixa key={grupo.id}>
          <Linha>
            <TextField label={`Título do grupo ${indice + 1}`} value={grupo.titulo} maxLength={80} placeholder="Ex.: Tecido" onChange={(event) => mudar("ficha", form.ficha.map((outro) => (outro.id === grupo.id ? { ...outro, titulo: event.target.value } : outro)))} />
            <IconButton icon={TrashIcon} label={`Remover o grupo ${grupo.titulo || indice + 1}`} variant="ghost" size="sm" tooltip="left" onClick={() => mudar("ficha", form.ficha.filter((outro) => outro.id !== grupo.id))} />
          </Linha>
          {grupo.itens.map((item, linha) => <ParFicha key={item.id}>
            <TextField label="Rótulo" hideLabel={linha > 0} value={item.rotulo} maxLength={80} placeholder="Composição" onChange={(event) => mudar("ficha", form.ficha.map((outro) => (outro.id === grupo.id ? { ...outro, itens: outro.itens.map((par) => (par.id === item.id ? { ...par, rotulo: event.target.value } : par)) } : outro)))} />
            <TextField label="Valor" hideLabel={linha > 0} value={item.valor} maxLength={500} placeholder="100% algodão" onChange={(event) => mudar("ficha", form.ficha.map((outro) => (outro.id === grupo.id ? { ...outro, itens: outro.itens.map((par) => (par.id === item.id ? { ...par, valor: event.target.value } : par)) } : outro)))} />
            <IconButton icon={TrashIcon} label="Remover linha" variant="ghost" size="sm" tooltip="left" onClick={() => mudar("ficha", form.ficha.map((outro) => (outro.id === grupo.id ? { ...outro, itens: outro.itens.filter((par) => par.id !== item.id) } : outro)))} />
          </ParFicha>)}
          <Button variant="ghost" size="sm" icon={PlusIcon} disabled={grupo.itens.length >= 40} onClick={() => mudar("ficha", form.ficha.map((outro) => (outro.id === grupo.id ? { ...outro, itens: [...outro.itens, { id: novaChave(), rotulo: "", valor: "" }] } : outro)))}>Adicionar linha</Button>
        </GrupoFichaCaixa>)}
        <Button variant="secondary" size="sm" icon={ListBulletsIcon} disabled={form.ficha.length >= 20} onClick={() => mudar("ficha", [...form.ficha, { id: novaChave(), titulo: "", itens: [{ id: novaChave(), rotulo: "", valor: "" }] }])}>Adicionar grupo à ficha</Button>
      </Secao>

      <Secao id="relacionados" titulo="Relacionados" icone={LinkSimpleIcon} descricao="Vitrines no fim da página do produto, na ordem da lista. Só os produtos ativos aparecem na loja.">
        <Campo rotulo="Complete o enxoval (complementos)" dica="Peças que combinam com esta. Até 12.">
          <ListaProdutos itens={form.complementos} onChange={(itens) => mudar("complementos", itens)} maximo={12} proprio={id ?? undefined} disabled={!podeEditar} vazio="Nenhum complemento: a vitrine não aparece." />
        </Campo>
        <Divider />
        <Campo rotulo="Você também poderá gostar (semelhantes)" dica="Até 12. Vazio: a loja escolhe pela categoria.">
          <ListaProdutos itens={form.semelhantes} onChange={(itens) => mudar("semelhantes", itens)} maximo={12} proprio={id ?? undefined} disabled={!podeEditar} vazio="Automático: a loja mostra produtos da mesma categoria." />
        </Campo>
      </Secao>

      <Secao id="seo" titulo="SEO" icone={MagnifyingGlassIcon} descricao="Como a página aparece no Google e ao compartilhar. Vazio: usa o nome e o resumo.">
        <TextField label="Título para buscadores" value={form.seoTitulo} error={erros.seoTitulo} onChange={(event) => mudar("seoTitulo", event.target.value)} placeholder={form.nome || "Nome do produto"} hint={<Contador texto={form.seoTitulo} limite={70} ideal="ideal até 60" />} />
        <TextField label="Descrição para buscadores" multiline rows={3} value={form.seoDescricao} error={erros.seoDescricao} onChange={(event) => mudar("seoDescricao", event.target.value)} placeholder={form.resumo || "Resumo do produto"} hint={<Contador texto={form.seoDescricao} limite={170} ideal="ideal entre 120 e 160" />} />
        <Google aria-label="Prévia no Google">
          <small>{origemLoja.replace(/^https?:\/\//, "")} › produto › {form.slug || "…"}</small>
          <strong>{(form.seoTitulo.trim() || form.nome.trim() || "Nome do produto").slice(0, 70)}{form.seoTitulo.trim() ? "" : " | Milena Kerbage Ateliê"}</strong>
          <p>{(form.seoDescricao.trim() || form.resumo.trim() || "A descrição aparece aqui.").slice(0, 170)}</p>
        </Google>
      </Secao>
    </Corpo>

    {podeEditar && <SaveBar visible={sujo} saving={salvando} onSave={() => void salvar()} onDiscard={() => { setForm(inicial); setColecoesEscolhidas(null); setErros({}); setErro(""); if (!id) setSlugManual(false); }} />}
    {avisoSaida}
    <Confirmar aberto={confirmar === "arquivar"} titulo="Arquivar este produto?" acao="Arquivar" perigo={false} ocupado={ocupado} onFechar={() => setConfirmar(null)} onConfirmar={() => void arquivarOuExcluir("arquivar")}
      descricao="Sai da loja na hora. Os pedidos antigos continuam com o retrato do que foi pedido. Dá para restaurar mudando a situação para ativo." />
    <Confirmar aberto={confirmar === "excluir"} titulo="Excluir definitivamente?" acao="Excluir produto" ocupado={ocupado} onFechar={() => setConfirmar(null)} onConfirmar={() => void arquivarOuExcluir("excluir")}
      descricao="O produto, as fotos e as ligações com opções, coleções e outros produtos são apagados. Não dá para desfazer." />
    <Confirmar aberto={confirmar === "recarregar"} titulo="Recarregar o produto?" acao="Descartar e recarregar" onFechar={() => setConfirmar(null)} onConfirmar={() => { setConfirmar(null); setErro(""); void carregar(); void colecoes.recarregar(); setColecoesEscolhidas(null); }}
      descricao="As alterações desta tela que ainda não foram salvas serão descartadas." />
  </Page>;
}

const SECOES = [
  { id: "informacoes", rotulo: "Informações" }, { id: "preco", rotulo: "Preço" }, { id: "publicacao", rotulo: "Publicação" }, { id: "fotos", rotulo: "Fotos" },
  { id: "organizacao", rotulo: "Organização" }, { id: "opcoes", rotulo: "Opções" }, { id: "kit", rotulo: "Kit" }, { id: "personalizacao", rotulo: "Personalização" },
  { id: "ficha", rotulo: "Ficha técnica" }, { id: "relacionados", rotulo: "Relacionados" }, { id: "seo", rotulo: "SEO" },
];

/** Seção em duas colunas (explicação à esquerda, campos à direita), como nas Configurações, com âncora. */
function Secao({ id, titulo, descricao, icone, children }: { id: string; titulo: string; descricao: string; icone: IconSource; children: ReactNode }) {
  return <SecaoRaiz id={id} aria-labelledby={`${id}-titulo`}>
    <div><h3 id={`${id}-titulo`}>{renderIcon(icone, { size: 16, "aria-hidden": true })}{titulo}</h3><p>{descricao}</p></div>
    <Card>{children}</Card>
  </SecaoRaiz>;
}

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return <CampoRaiz role="group" aria-label={rotulo}><span>{rotulo}</span>{dica && <Sub>{dica}</Sub>}{children}</CampoRaiz>;
}

/* ---------- Estilos ---------- */


const Corpo = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(8)};
  min-width: 0;
  padding: 0;
  border: 0;

  ${({ theme }) => theme.media.xl} { gap: ${({ theme }) => theme.spacing(6)}; }
`;

const SecaoRaiz = styled.section`
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(8)};
  align-items: start;
  min-width: 0;
  scroll-margin-top: ${({ theme }) => theme.spacing(16)};

  > * { min-width: 0; }
  & + & { padding-top: ${({ theme }) => theme.spacing(8)}; border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle}; }

  > div:first-of-type {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(1.5)};

    h3 { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; svg { color: ${({ theme }) => theme.colors.text.muted}; } }
    p { font-size: 0.8125rem; line-height: 1.5; color: ${({ theme }) => theme.colors.text.muted}; }
  }

  ${({ theme }) => theme.media.xl} {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.spacing(3)};
    & + & { padding-top: ${({ theme }) => theme.spacing(6)}; }
  }
`;

const Atalhos = styled.nav`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  margin: ${({ theme }) => theme.spacing(-2, 0)};
  padding: ${({ theme }) => theme.spacing(2, 0)};
  overflow-x: auto;
  background-color: ${({ theme }) => theme.colors.background.surface};
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
  a {
    flex-shrink: 0;
    padding: ${({ theme }) => theme.spacing(1, 2.5)};
    border-radius: ${({ theme }) => theme.radii.full};
    font-size: 0.75rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.secondary};
    &:hover { background-color: ${({ theme }) => theme.colors.interactive.hover}; color: ${({ theme }) => theme.colors.text.primary}; }
  }
`;

const CampoRaiz = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;

  > span:first-of-type { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }
`;

const LinkBotao = styled.button`
  font: inherit;
  color: ${({ theme }) => theme.colors.text.brand};
  text-decoration: underline;
  text-underline-offset: 2px;
`;

const ErroTexto = styled.p`font-size: ${({ theme }) => theme.fontSizes.xs}; color: ${({ theme }) => theme.colors.danger};`;

const Previa = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(3.5, 4)};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-size: 0.875rem;

  > small { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; color: ${({ theme }) => theme.colors.text.muted}; }
  p { color: ${({ theme }) => theme.colors.text.secondary}; }
  p span { font-size: 0.8125rem; }
  strong { font-size: 1.125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  b { font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.success}; }
  s { color: ${({ theme }) => theme.colors.text.muted}; }
`;

const Vazio = styled.div`display: flex; flex-direction: column; align-items: flex-start; gap: ${({ theme }) => theme.spacing(3)};`;

const Atributos = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};

  > div {
    display: grid;
    grid-template-columns: minmax(6rem, 10rem) minmax(0, 1fr) auto;
    gap: ${({ theme }) => theme.spacing(2)};
    align-items: end;
  }
  > button { align-self: flex-start; }
`;

const GruposLigados = styled.ul`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing(3)};
    padding: ${({ theme }) => theme.spacing(3)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    font-size: 0.8125rem;

    &:last-of-type { border-bottom: 0; }
    > div:first-of-type { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; }
    > div:last-of-type { flex-wrap: nowrap; }
    strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; }
  }
`;

const GrupoFichaCaixa = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};

  > div:first-of-type { flex-wrap: nowrap; align-items: end; > div { flex: 1; } }
  > button { align-self: flex-start; }
`;

const ParFicha = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: end;

  ${({ theme }) => theme.media.sm} { grid-template-columns: minmax(0, 1fr) auto; > div:nth-of-type(2) { grid-column: 1; } > button { grid-row: 1; grid-column: 2; } }
`;

const Google = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing(3.5, 4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-family: Arial, sans-serif;
  overflow-wrap: anywhere;

  small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; }
  strong { font-size: 1.0625rem; font-weight: 400; color: ${({ theme }) => (theme.mode === "dark" ? "#8ab4f8" : "#1a0dab")}; }
  p { font-size: 0.8125rem; line-height: 1.5; color: ${({ theme }) => theme.colors.text.secondary}; }
`;

