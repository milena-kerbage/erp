import "server-only";
import { TERMOS_MAIS_BUSCADOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { dividirNome, fotosDoProduto } from "@/loja/componentes/produto/dados";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { listarProjetos } from "@/loja/lib/casas/catalogo";
import type { ArvoreCategorias } from "@/loja/lib/catalogo/categorias";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { buscarTexto, noCaminho } from "@/loja/lib/catalogo/listagem";
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
import { termosDaCuradoria } from "./curadoria";

// Índice das sugestões da busca, montado no servidor a partir do catálogo (uma vez por processo) e
// respondido pela rota /api/busca/sugestoes. Fontes dos termos: mais buscados, categorias, cores,
// tecidos, temas e estilos e o nome das peças. Todo termo sugerido leva a uma /busca com resultado
// (é conferido com a mesma buscarTexto da página de resultados). O catálogo é o da loja (cadastro do ERP
// ou o de exemplo): o índice e as respostas guardadas valem para uma versão do catálogo e são refeitos
// quando ele muda (escrita no ERP → revalidateTag).

const ATRIBUTOS_TERMO = ["cor", "tecido", "tema", "estilo"] as const;
const MAXIMO_CATEGORIAS = 3;
const MAXIMO_PROJETOS = 2;
const MAXIMO_CACHE = 300;

type Indice = { termos: TermoIndice[]; produtos: Produto[]; categorias: EloSugerido[]; projetos: Array<EloSugerido & { texto: string }>; destaques: string[] };

let indice: { versao: string; dados: Indice } | null = null;
const cache = new Map<string, RespostaSugestoes>();

function minusculo(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR");
}

function montarIndice(produtos: Produto[], arvore: ArvoreCategorias, destaques: string[]): Indice {
  const { buscarCategoria, existentes: CATEGORIAS_EXISTENTES } = arvore;
  const candidatos: TermoIndice[] = [
    ...[...TERMOS_MAIS_BUSCADOS, ...termosDaCuradoria({ produtos })].map((texto) => ({ texto, fonte: "popular" as const })),
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
    .filter((categoria) => categoria.rotulo && produtos.some(produto => noCaminho([produto], categoria.href).length > 0));
  const projetos = listarProjetos().map((projeto) => ({
    rotulo: projeto.nome,
    href: `/personalizado/${projeto.slug}`,
    texto: `${projeto.nome} ${projeto.tema} ${projeto.estilo} ${projeto.tecido}`,
  }));
  return { termos, produtos, categorias, projetos, destaques };
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
export async function sugerir(q: string): Promise<RespostaSugestoes> {
  const chave = normalizarTexto(q);
  if (chave.length < MINIMO_CARACTERES) return vazio(q);
  const catalogo = await catalogoDaLoja();
  if (indice?.versao !== catalogo.versao) {
    indice = { versao: catalogo.versao, dados: montarIndice(catalogo.produtos, await arvoreDaLoja(), catalogo.maisVendidos) };
    cache.clear();
  }
  const guardada = cache.get(chave);
  if (guardada) return { ...guardada, q };

  const dados = indice.dados;
  const encontrados = buscarTexto(dados.produtos, q);
  const produtos = ordenarProdutos(
    encontrados.map((produto) => ({ ...produto, familia: familiaDe(produto) })),
    q,
    { destaques: dados.destaques },
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
    termos: sugerirTermos(dados.termos, q),
    produtos,
    categorias: melhores(dados.categorias, (categoria) => categoria.rotulo, q, MAXIMO_CATEGORIAS),
    projetos: melhores(dados.projetos, (projeto) => projeto.texto, q, MAXIMO_PROJETOS),
    total: encontrados.length,
  };
  if (cache.size >= MAXIMO_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(chave, resposta);
  return resposta;
}
