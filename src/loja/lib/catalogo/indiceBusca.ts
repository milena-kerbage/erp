import "server-only";
import { TERMOS_MAIS_BUSCADOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { dividirNome, fotosDoProduto } from "@/loja/componentes/produto/dados";
import { listarProjetos } from "@/loja/lib/casas/catalogo";
import { buscarCategoria, CATEGORIAS_EXISTENTES } from "@/loja/lib/catalogo/categorias";
import { listarProdutos, MAIS_VENDIDOS_SLUGS, type Produto } from "@/loja/lib/catalogo/exemplos";
import { buscarTexto } from "@/loja/lib/catalogo/listagem";
import {
  type EloSugerido,
  MINIMO_CARACTERES,
  normalizarTexto,
  ordenarProdutos,
  pontuar,
  type RespostaSugestoes,
  sugerirTermos,
  type TermoIndice,
} from "@/loja/lib/catalogo/sugestoes";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";

// Índice das sugestões da busca, montado no servidor a partir do catálogo (uma vez por processo) e
// respondido pela rota /api/busca/sugestoes. Fontes dos termos: mais buscados, categorias, cores,
// tecidos, temas e estilos e o nome das peças. Todo termo sugerido leva a uma /busca com resultado
// (é conferido com a mesma buscarTexto da página de resultados). Quando o catálogo vier da API do
// ERP, só a montagem do índice muda.

const ATRIBUTOS_TERMO = ["cor", "tecido", "tema", "estilo"] as const;
const MAXIMO_CATEGORIAS = 3;
const MAXIMO_PROJETOS = 2;
const MAXIMO_CACHE = 300;

type Indice = { termos: TermoIndice[]; produtos: Produto[]; categorias: EloSugerido[]; projetos: Array<EloSugerido & { texto: string }> };

let indice: Indice | null = null;
const cache = new Map<string, RespostaSugestoes>();

function minusculo(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR");
}

function montarIndice(): Indice {
  const produtos = listarProdutos();
  const candidatos: TermoIndice[] = [
    ...TERMOS_MAIS_BUSCADOS.map((texto) => ({ texto, fonte: "popular" as const })),
    ...[...CATEGORIAS_EXISTENTES].map((chave) => ({ texto: minusculo(buscarCategoria(chave)?.rotulo ?? ""), fonte: "categoria" as const })),
    ...produtos.flatMap((produto) =>
      ATRIBUTOS_TERMO.flatMap((chave) => (produto.atributos[chave] ?? []).map((valor) => ({ texto: minusculo(valor), fonte: "atributo" as const }))),
    ),
    ...produtos.map((produto) => ({ texto: minusculo(dividirNome(produto.nome).base), fonte: "produto" as const })),
  ];
  // Só fica o termo que leva a resultado na /busca (e uma vez só).
  const vistos = new Set<string>();
  const termos = candidatos.filter((termo) => {
    const chave = normalizarTexto(termo.texto);
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return buscarTexto(produtos, termo.texto).length > 0;
  });
  const categorias = [...CATEGORIAS_EXISTENTES]
    .map((chave) => ({ rotulo: buscarCategoria(chave)?.rotulo ?? chave, href: `/${chave}` }))
    .filter((categoria) => categoria.rotulo);
  const projetos = listarProjetos().map((projeto) => ({
    rotulo: projeto.nome,
    href: `/projetos/${projeto.slug}`,
    texto: `${projeto.nome} ${projeto.tema} ${projeto.estilo} ${projeto.tecido}`,
  }));
  return { termos, produtos, categorias, projetos };
}

function familiaDe(produto: Produto): string | undefined {
  return produto.irmaos?.titulo === "Cor" ? produto.irmaos.itens.map((irmao) => irmao.slug).join("|") : undefined;
}

function melhores<T extends EloSugerido>(itens: T[], texto: (item: T) => string, consulta: string, limite: number): EloSugerido[] {
  return itens
    .map((item, ordem) => ({ item, ordem, pontos: pontuar(texto(item), consulta) }))
    .filter((pontuado) => pontuado.pontos >= 0)
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map(({ item }) => ({ rotulo: item.rotulo, href: item.href }));
}

export function vazio(q: string): RespostaSugestoes {
  return { q, termos: [], produtos: [], categorias: [], projetos: [], total: 0 };
}

// A consulta já chega aparada (normalizarBusca); a chave do cache é a forma normalizada.
export function sugerir(q: string): RespostaSugestoes {
  const chave = normalizarTexto(q);
  if (chave.length < MINIMO_CARACTERES) return vazio(q);
  const guardada = cache.get(chave);
  if (guardada) return { ...guardada, q };

  indice ??= montarIndice();
  const encontrados = buscarTexto(indice.produtos, q);
  const produtos = ordenarProdutos(
    encontrados.map((produto) => ({ ...produto, familia: familiaDe(produto) })),
    q,
    { destaques: MAIS_VENDIDOS_SLUGS },
  ).map((produto) => {
    const { base, variacao } = dividirNome(produto.nome);
    const [foto] = fotosDoProduto(produto);
    return {
      slug: produto.slug,
      href: `/produto/${produto.slug}`,
      nome: produto.nome,
      base,
      variacao,
      preco: formatarPreco(produto.preco),
      foto: foto?.src ? { src: foto.src, alt: foto.alt } : undefined,
      tom: foto?.tom ?? "linho",
    };
  });
  const resposta: RespostaSugestoes = {
    q,
    termos: sugerirTermos(indice.termos, q),
    produtos,
    categorias: melhores(indice.categorias, (categoria) => categoria.rotulo, q, MAXIMO_CATEGORIAS),
    projetos: melhores(indice.projetos, (projeto) => projeto.texto, q, MAXIMO_PROJETOS),
    total: encontrados.length,
  };
  if (cache.size >= MAXIMO_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(chave, resposta);
  return resposta;
}
