"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import {
  ArchiveIcon, ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowSquareOutIcon, ArrowsDownUpIcon, CopyIcon, DotsThreeIcon, FolderSimpleIcon, ImageIcon,
  PackageIcon, PencilSimpleIcon, PlusIcon, RocketLaunchIcon, StackIcon, TrashIcon, TruckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, FilterBarButton, type FilterSection } from "@/components/ui/FilterBar";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Card, Notice, Page, PageHeader, Pill } from "@/features/operations/components/ui";
import type { ColecaoGestao, Disponibilidade, OrdenacaoProdutos, ProdutoResumoGestao, RespostaCategorias, RespostaProdutos, StatusProduto } from "@/features/ecommerce/types";
import { DISPONIBILIDADE, dataHora, erpRequest, loja, reais, requestError, STATUS_PRODUTO, trilhasDeCategorias } from "./api";
import { AcoesCabecalho, AvisoSomenteLeitura, Confirmar, Sub, usePodeEditar, useRecurso } from "./comum";

type Aba = StatusProduto | "todos";
type Acao = { tipo: "arquivar" | "excluir"; produto: ProdutoResumoGestao } | null;
const PAGINA = 50;

const ORDENACOES: Record<OrdenacaoProdutos, string> = {
  ordem: "Ordem da loja", nome: "Nome (A a Z)", preco: "Menor preço", "-preco": "Maior preço", recentes: "Editados recentemente", sku: "SKU",
};

/**
 * Produtos da loja: lista com foto, preço "a partir de", situação e disponibilidade; busca, filtros
 * (categoria, coleção, disponibilidade), ordenação e ações (editar, duplicar, publicar, arquivar,
 * restaurar, excluir e ver na loja). Só os ativos aparecem no site.
 */
export function ProdutosLista({ origemLoja }: { origemLoja: string }) {
  const router = useRouter();
  const podeEditar = usePodeEditar();
  const [aba, setAba] = useState<Aba>("todos");
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [colecao, setColecao] = useState("");
  const [disponibilidade, setDisponibilidade] = useState<"" | Disponibilidade>("");
  const [ordenar, setOrdenar] = useState<OrdenacaoProdutos>("ordem");
  const [dados, setDados] = useState<RespostaProdutos | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [acao, setAcao] = useState<Acao>(null);
  const categorias = useRecurso<RespostaCategorias>(loja("categorias"));
  const colecoes = useRecurso<{ colecoes: ColecaoGestao[] }>(loja("colecoes"));

  useEffect(() => { const timer = window.setTimeout(() => setTermo(busca.trim()), 300); return () => window.clearTimeout(timer); }, [busca]);
  const caminho = useCallback((offset: number) => {
    const params = new URLSearchParams({ status: aba, limit: String(PAGINA), offset: String(offset), ordenar });
    if (termo) params.set("busca", termo);
    if (categoria) params.set("categoria", categoria);
    if (colecao) params.set("colecao", colecao);
    if (disponibilidade) params.set("disponibilidade", disponibilidade);
    return loja(`produtos?${params}`);
  }, [aba, termo, categoria, colecao, disponibilidade, ordenar]);
  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true); setErro("");
    try { setDados(await erpRequest<RespostaProdutos>(caminho(0), { signal })); }
    catch (caught) { if (!signal?.aborted) setErro(requestError(caught)); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }, [caminho]);
  useEffect(() => { const controle = new AbortController(); void carregar(controle.signal); return () => controle.abort(); }, [carregar]);

  async function carregarMais() {
    if (!dados) return;
    setCarregando(true);
    try { const proxima = await erpRequest<RespostaProdutos>(caminho(dados.produtos.length)); setDados({ ...proxima, produtos: [...dados.produtos, ...proxima.produtos.filter((item) => !dados.produtos.some((existente) => existente.id === item.id))] }); }
    catch (caught) { setErro(requestError(caught)); } finally { setCarregando(false); }
  }

  async function executar(produto: ProdutoResumoGestao, rotulo: string, tarefa: () => Promise<unknown>, mensagem: string) {
    setOcupado(produto.id); setErro(""); setAviso("");
    try { await tarefa(); setAviso(mensagem); setAcao(null); await carregar(); }
    catch (caught) { setErro(`${rotulo}: ${requestError(caught)}`); setAcao(null); }
    finally { setOcupado(""); }
  }
  const mudarStatus = (produto: ProdutoResumoGestao, status: StatusProduto) => executar(produto, produto.nome,
    () => erpRequest(loja(`produtos/${produto.id}`), { method: "PATCH", body: { revisao: produto.revisao, status } }),
    status === "ativo" ? `“${produto.nome}” está na loja.` : `“${produto.nome}” voltou para rascunho.`);
  const arquivar = (produto: ProdutoResumoGestao) => executar(produto, produto.nome,
    () => erpRequest(loja(`produtos/${produto.id}/arquivar`), { method: "POST", body: { revisao: produto.revisao } }), `“${produto.nome}” foi arquivado e saiu da loja.`);
  const excluir = (produto: ProdutoResumoGestao) => executar(produto, produto.nome,
    () => erpRequest(loja(`produtos/${produto.id}?revisao=${produto.revisao}`), { method: "DELETE" }), `“${produto.nome}” foi excluído.`);
  async function duplicar(produto: ProdutoResumoGestao) {
    setOcupado(produto.id); setErro(""); setAviso("");
    try {
      const { produto: copia } = await erpRequest<{ produto: { id: string } }>(loja(`produtos/${produto.id}/duplicar`), { method: "POST", body: {} });
      startNavigationProgress();
      router.push(`/ecommerce/produtos/${copia.id}?copia=1`);
    } catch (caught) { setErro(`${produto.nome}: ${requestError(caught)}`); setOcupado(""); }
  }

  const contagem = dados?.contagem;
  const abas = useMemo(() => [
    { value: "todos" as const, label: "Todos", count: contagem ? contagem.ativo + contagem.rascunho + contagem.arquivado : undefined },
    { value: "ativo" as const, label: "Ativos", count: contagem?.ativo },
    { value: "rascunho" as const, label: "Rascunhos", count: contagem?.rascunho },
    { value: "arquivado" as const, label: "Arquivados", count: contagem?.arquivado },
  ], [contagem]);

  const listaCategorias = categorias.dados?.categorias ?? [];
  const trilhas = useMemo(() => trilhasDeCategorias(listaCategorias), [listaCategorias]);
  const nivel = (caminhoCategoria: string) => caminhoCategoria.split("/").length - 1;
  const secoes: FilterSection[] = [
    {
      kind: "single", id: "categoria", label: "Categoria", value: categoria, defaultValue: "", onChange: setCategoria,
      options: [{ value: "", label: "Todas as categorias", leading: <FolderSimpleIcon size={16} /> }, ...listaCategorias.map((item) => ({
        value: item.id, label: trilhas.get(item.id) ?? item.nome, keywords: item.caminho, count: item.produtos, leading: <FolderSimpleIcon size={16} weight={nivel(item.caminho) ? "regular" : "fill"} />,
      }))],
    },
    {
      kind: "single", id: "colecao", label: "Coleção", value: colecao, defaultValue: "", onChange: setColecao,
      options: [{ value: "", label: "Qualquer coleção", leading: <StackIcon size={16} /> }, ...(colecoes.dados?.colecoes ?? []).map((item) => ({ value: item.id, label: item.nome, count: item.produtos.length, leading: <StackIcon size={16} /> }))],
    },
    {
      kind: "single", id: "disponibilidade", label: "Disponibilidade", value: disponibilidade, defaultValue: "", onChange: (valor) => setDisponibilidade(valor as "" | Disponibilidade),
      options: [
        { value: "pronta_entrega", label: "Pronta entrega", leading: <TruckIcon size={16} /> },
        { value: "sob_encomenda", label: "Sob encomenda", leading: <PackageIcon size={16} /> },
        { value: "", label: "Qualquer disponibilidade", leading: <PackageIcon size={16} /> },
      ],
    },
  ];
  const filtrado = Boolean(termo || categoria || colecao || disponibilidade);
  const limpar = () => { setBusca(""); setCategoria(""); setColecao(""); setDisponibilidade(""); };
  const produtos = dados?.produtos ?? [];

  const acoes = (produto: ProdutoResumoGestao) => <Menu label={`Ações de ${produto.nome}`} align="end" width="15rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} disabled={ocupado === produto.id} />}>
    <MenuItem icon={PencilSimpleIcon} href={`/ecommerce/produtos/${produto.id}`}>{podeEditar ? "Editar" : "Abrir"}</MenuItem>
    {produto.status === "ativo"
      ? <MenuItem icon={ArrowSquareOutIcon} onSelect={() => window.open(`${origemLoja}/produto/${produto.slug}`, "_blank", "noopener,noreferrer")}>Ver na loja</MenuItem>
      : <MenuItem icon={ArrowSquareOutIcon} disabled meta="só ativo">Ver na loja</MenuItem>}
    {podeEditar && <>
      <MenuItem icon={CopyIcon} onSelect={() => void duplicar(produto)}>Duplicar como rascunho</MenuItem>
      <MenuSeparator />
      {produto.status === "rascunho" && <MenuItem icon={RocketLaunchIcon} onSelect={() => void mudarStatus(produto, "ativo")}>Publicar na loja</MenuItem>}
      {produto.status === "arquivado" && <MenuItem icon={ArrowCounterClockwiseIcon} onSelect={() => void mudarStatus(produto, "ativo")}>Restaurar na loja</MenuItem>}
      {produto.status === "arquivado" && <MenuItem icon={ArrowCounterClockwiseIcon} onSelect={() => void mudarStatus(produto, "rascunho")}>Restaurar como rascunho</MenuItem>}
      {produto.status === "ativo" && <MenuItem icon={ArchiveIcon} onSelect={() => setAcao({ tipo: "arquivar", produto })}>Arquivar (tirar da loja)</MenuItem>}
      {produto.status !== "ativo" && <MenuItem icon={TrashIcon} muted onSelect={() => setAcao({ tipo: "excluir", produto })}>Excluir definitivamente</MenuItem>}
    </>}
  </Menu>;

  const foto = (produto: ProdutoResumoGestao, grande = false) => <Foto $grande={grande} aria-hidden>{produto.imagem ? <img src={produto.imagem} alt="" loading="lazy" /> : <ImageIcon size={grande ? 22 : 18} />}</Foto>;
  const preco = (produto: ProdutoResumoGestao) => <Preco><small>a partir de</small> <strong>{reais(produto.precoCentavos)}</strong>{produto.precoDeCentavos ? <s>{reais(produto.precoDeCentavos)}</s> : null}</Preco>;
  const status = (produto: ProdutoResumoGestao) => <Pill $tone={STATUS_PRODUTO[produto.status].tom} title={STATUS_PRODUTO[produto.status].descricao}>{STATUS_PRODUTO[produto.status].rotulo}</Pill>;
  const entrega = (produto: ProdutoResumoGestao) => <Pill $tone={produto.disponibilidade === "pronta_entrega" ? "teal" : "neutral"} $outline={produto.disponibilidade !== "pronta_entrega"}>{DISPONIBILIDADE[produto.disponibilidade]}</Pill>;

  return <Page>
    <PageHeader title="Produtos" description="O catálogo da loja: preço “a partir de”, pedido pelo WhatsApp e 5% OFF no Pix. Só os produtos ativos aparecem no site."
      actions={<AcoesCabecalho>
        <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando && Boolean(dados)} onClick={() => void carregar()}>Atualizar</Button>
        {podeEditar && <Button icon={PlusIcon} href="/ecommerce/produtos/novo">Novo produto</Button>}
      </AcoesCabecalho>} />
    {!podeEditar && <AvisoSomenteLeitura oque="os produtos da loja" />}
    {erro && <Notice role="alert">{erro} <Button variant="ghost" size="sm" onClick={() => void carregar()}>Tentar novamente</Button></Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}
    <Card>
      <FilterBar search={{ label: "Buscar produtos", placeholder: "Buscar por nome, SKU ou slug", shortPlaceholder: "Buscar produtos", value: busca, onChange: setBusca }} sections={secoes}
        trailing={<Select label="Ordenar por" heading="Ordenar por" align="end" width="15rem" value={ordenar} onChange={setOrdenar}
          options={(Object.keys(ORDENACOES) as OrdenacaoProdutos[]).map((chave) => ({ value: chave, label: ORDENACOES[chave] }))}
          trigger={({ open: _open, ...props }) => <FilterBarButton type="button" {...props} aria-label={`Ordenar: ${ORDENACOES[ordenar]}`}><ArrowsDownUpIcon size={17} aria-hidden /><OrdemRotulo>{ORDENACOES[ordenar]}</OrdemRotulo></FilterBarButton>} />} />
      <Tabs items={abas} value={aba} onChange={setAba} label="Situação dos produtos">
        {carregando && !dados ? <Esqueleto /> : !produtos.length ? (
          <EmptyState icon={<PackageIcon size={24} />} title={erro ? "A lista não pôde ser carregada." : filtrado ? "Nenhum produto encontrado" : aba === "todos" ? "Nenhum produto cadastrado" : `Nenhum produto ${STATUS_PRODUTO[aba as StatusProduto].rotulo.toLowerCase()}`}
            description={erro ? "Tente de novo em instantes." : filtrado ? "Ajuste a busca ou os filtros para ver mais produtos." : "Cadastre o primeiro produto: ele nasce como rascunho e só entra na loja quando ficar ativo."}>
            {filtrado && <Button variant="secondary" size="sm" onClick={limpar}>Limpar busca e filtros</Button>}
            {!filtrado && podeEditar && <Button size="sm" icon={PlusIcon} href="/ecommerce/produtos/novo">Novo produto</Button>}
          </EmptyState>
        ) : <>
          <TabelaRolagem><Tabela>
            <thead><tr><th aria-label="Foto" /><th>Produto</th><th>SKU</th><th>Categoria</th><th>Preço</th><th>Situação</th><th>Disponibilidade</th><th>Atualizado</th><th aria-label="Ações" /></tr></thead>
            <tbody>{produtos.map((produto) => <tr key={produto.id} aria-busy={ocupado === produto.id || undefined}>
              <td>{foto(produto)}</td>
              <td><Nome href={`/ecommerce/produtos/${produto.id}`}>{produto.nome}</Nome>{produto.destaque && <Destaque>Destaque</Destaque>}{produto.selo && <Destaque>{produto.selo}</Destaque>}<Sub>/produto/{produto.slug}</Sub></td>
              <td><Codigo>{produto.sku}</Codigo></td>
              <td><span title={produto.caminho}>{produto.categoriaNome}</span></td>
              <td>{preco(produto)}</td>
              <td>{status(produto)}</td>
              <td>{entrega(produto)}</td>
              <td><Sub title={dataHora(produto.atualizadoEm)}>{dataCurta(produto.atualizadoEm)}</Sub></td>
              <td>{acoes(produto)}</td>
            </tr>)}</tbody>
          </Tabela></TabelaRolagem>
          <Cartoes>{produtos.map((produto) => <Cartao key={produto.id} aria-busy={ocupado === produto.id || undefined}>
            {foto(produto, true)}
            <div>
              <Nome href={`/ecommerce/produtos/${produto.id}`}>{produto.nome}</Nome>
              <Sub>{produto.sku} · {produto.categoriaNome}</Sub>
              {preco(produto)}
              <Etiquetas>{status(produto)}{entrega(produto)}</Etiquetas>
            </div>
            {acoes(produto)}
          </Cartao>)}</Cartoes>
        </>}
      </Tabs>
      <Rodape>{produtos.length} produto(s) exibido(s){dados && dados.pagination.total > produtos.length ? ` de ${dados.pagination.total}` : ""}.</Rodape>
    </Card>
    {dados?.pagination.hasMore && <Button variant="secondary" loading={carregando} onClick={() => void carregarMais()}>Carregar mais produtos</Button>}

    <Confirmar aberto={acao?.tipo === "arquivar"} titulo={`Arquivar “${acao?.produto.nome ?? ""}”?`} acao="Arquivar" perigo={false} ocupado={Boolean(ocupado)}
      descricao="O produto sai da loja na hora (página, listagens, busca e coleções). Os pedidos antigos continuam com o retrato do que foi pedido. Dá para restaurar depois."
      onFechar={() => setAcao(null)} onConfirmar={() => acao && void arquivar(acao.produto)} />
    <Confirmar aberto={acao?.tipo === "excluir"} titulo={`Excluir “${acao?.produto.nome ?? ""}”?`} acao="Excluir definitivamente" ocupado={Boolean(ocupado)}
      descricao="O produto, as fotos, as opções ligadas e as relações com outros produtos e coleções são apagados. Não dá para desfazer. Se quiser só tirar da loja, arquive."
      onFechar={() => setAcao(null)} onConfirmar={() => acao && void excluir(acao.produto)} />
  </Page>;
}

function Esqueleto() {
  return <EsqueletoLista role="status" aria-label="Carregando produtos">{Array.from({ length: 6 }, (_, indice) => <div key={indice}><Skeleton $width="2.75rem" $height="2.75rem" $radius="md" /><div><Skeleton $width="40%" /><Skeleton $width="25%" $height="0.75rem" /></div><Skeleton $width="5rem" /></div>)}</EsqueletoLista>;
}

/* ---------- Estilos ---------- */

const OrdemRotulo = styled.span`${({ theme }) => theme.media.md} { display: none; }`;

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Fortaleza" });

const TabelaRolagem = styled.div`
  margin-top: ${({ theme }) => theme.spacing(2)};
  overflow-x: auto;

  ${({ theme }) => theme.media.md} { display: none; }
`;

const Tabela = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th {
    height: 2.25rem;
    padding: ${({ theme }) => theme.spacing(0, 2.5)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.muted};
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: ${({ theme }) => theme.spacing(2.5)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    color: ${({ theme }) => theme.colors.text.primary};
    vertical-align: middle;
  }

  td:first-of-type, th:first-of-type { width: 3.25rem; padding-left: 0; }
  td:last-of-type, th:last-of-type { width: 2.5rem; padding-right: 0; text-align: right; }
  td:nth-of-type(2) { min-width: 14rem; }
  tbody tr:last-of-type td { border-bottom: 0; }
  tbody tr:hover td { background-color: ${({ theme }) => theme.colors.interactive.hover}; }
  tr[aria-busy] { opacity: 0.55; }
  td:nth-of-type(8) { white-space: nowrap; }

  /* Tela média: a coluna de data sai para o resto caber sem rolar */
  ${({ theme }) => theme.media.xl} { th:nth-of-type(8), td:nth-of-type(8) { display: none; } }
`;

const Foto = styled("span", { shouldForwardProp: (prop) => !prop.startsWith("$") })<{ $grande: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $grande }) => ($grande ? "4rem" : "2.75rem")};
  height: ${({ $grande }) => ($grande ? "4.75rem" : "3.25rem")};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.background.surface};
  color: ${({ theme }) => theme.colors.text.muted};

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Nome = styled(Link)`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;

  &:hover { text-decoration: underline; text-decoration-color: ${({ theme }) => theme.colors.border.strong}; text-underline-offset: 3px; }
`;

const Destaque = styled.span`
  display: inline-block;
  margin-left: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme }) => theme.tones.lavender.soft};
  color: ${({ theme }) => theme.tones.lavender.fg};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  vertical-align: 1px;
`;

const Codigo = styled.code`font-family: ${({ theme }) => theme.fonts.mono}; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap;`;

const Preco = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 ${({ theme }) => theme.spacing(1)};
  white-space: nowrap;

  small { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.muted}; }
  strong { font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
  s { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;

const Cartoes = styled.div`
  display: none;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.spacing(2)};

  ${({ theme }) => theme.media.md} { display: flex; }
`;

const Cartao = styled.article`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: start;
  padding: ${({ theme }) => theme.spacing(3, 0)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
  font-size: 0.8125rem;

  &:last-of-type { border-bottom: 0; }
  &[aria-busy] { opacity: 0.55; }
  > div { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; }
`;

const Etiquetas = styled.span`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(1)};`;
const Rodape = styled.small`color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.75rem;`;

const EsqueletoLista = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.spacing(2)};

  > div {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: ${({ theme }) => theme.spacing(3)};
    align-items: center;
    padding: ${({ theme }) => theme.spacing(2.5, 0)};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};

    > div { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1.5)}; }
  }
`;
