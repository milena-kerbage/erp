import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { blocosDaCategoria, LINHA_BLOCOS_CATEGORIA } from "@/loja/lib/catalogo/edicoes";
import { filtrar, noCaminho } from "@/loja/lib/catalogo/listagem";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { interpretarUrlListagem, ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Listagem por categoria no modelo da Lululemon (shop.lululemon.com/c/women-puffer-jackets, nov/2026).
// URL, facetas indexáveis no caminho, canonical e 404 vêm do motor (src/lib/seo/urls.ts); a forma
// canônica é imposta com 308 no proxy. Cache Components: o topo de cada categoria é estático
// (pré-gerado); a grade filtrada (searchParams) fica no <Suspense>.

type Props = PageProps<"/loja/[...categoria]">;

// /personalizado e /personalizado/<página> têm rota própria (src/app/(site)/loja/(vitrine)/personalizado): a área Personalizado fica fora daqui.
// Categorias do cadastro do ERP (ou as do menu estático, no fallback): src/lib/loja/catalogo.ts.
export async function generateStaticParams() {
  return (await arvoreDaLoja())
    .caminhosParaPreGerar()
    .filter((categoria) => categoria[0] !== "personalizado")
    .map((categoria) => ({ categoria }));
}

async function resolver(segmentos: string[]) {
  const [arvore, catalogo] = await Promise.all([arvoreDaLoja(), catalogoDaLoja()]);
  const { buscarCategoria, irmas, rotuloFaceta } = arvore;
  const caminho = `/${segmentos.join("/")}`;
  const resultado = interpretarUrlListagem(caminho, new URLSearchParams(), arvore.existentes, REGRAS_SEO);
  if (resultado.tipo !== "ok") return null;
  const categoria = buscarCategoria(resultado.listagem.categoria);
  if (!categoria) return null;
  const faceta = rotuloFaceta(categoria.chave, caminho);
  const produtos = noCaminho(catalogo.produtos, `/${categoria.chave}`);
  return {
    categoria,
    titulo: faceta ?? categoria.rotulo,
    trilha: faceta ? [...categoria.trilha, { rotulo: categoria.rotulo, href: `/${categoria.chave}` }] : categoria.trilha,
    produtos,
    total: filtrar(produtos, resultado.listagem.filtros).length,
    canonical: resultado.decisao.canonical,
    atalhos: categoria.filhos.length ? categoria.filhos : categoria.facetas.length ? categoria.facetas : irmas(categoria.chave),
    relacionadas: arvore.categoriasRelacionadas([categoria.chave]),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await resolver((await params).categoria);
  if (!dados) return {};
  return {
    title: dados.titulo,
    description: `${dados.titulo} do Ateliê Milena Kerbage: ${dados.total} peças de enxoval feitas à mão em Fortaleza, com entrega para todo o Brasil.`,
    alternates: { canonical: dados.canonical },
    // Catálogo de exemplo (preços fictícios): fora do índice até a API de catálogo existir.
    robots: { index: false, follow: true },
  };
}

// params lido FORA do <Suspense> de propósito: categoria inexistente vira 404 com status 404 antes
// do streaming (dentro do Suspense o Next já teria mandado 200). As categorias do build são
// pré-geradas; só a grade filtrada (searchParams) fica dentro do Suspense.
export default async function PaginaCategoria({ params, searchParams }: Props) {
  const dados = await resolver((await params).categoria);
  if (!dados) notFound();
  return (
    <>
      <CabecalhoListagem trilha={dados.trilha} titulo={dados.titulo} total={dados.total} atalhos={dados.atalhos} />
      <Suspense fallback={<EsqueletoGrade />}>
        <Grade params={params} searchParams={searchParams} />
      </Suspense>
      <ContinueExplorando base={dados.titulo} categorias={dados.relacionadas} />
    </>
  );
}

async function Grade({ params, searchParams }: Props) {
  const segmentos = (await params).categoria;
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(valor) ? valor : [valor ?? ""]) busca.append(chave, item);
  }
  const [arvore, catalogo] = await Promise.all([arvoreDaLoja(), catalogoDaLoja()]);
  const resultado = interpretarUrlListagem(`/${segmentos.join("/")}`, busca, arvore.existentes, REGRAS_SEO);
  if (resultado.tipo === "nao-encontrado") notFound();
  if (resultado.tipo === "redirecionar") redirect(resultado.destino); // o proxy já cuida disso com 308; aqui é a rede de segurança
  const categoria = resultado.listagem.categoria;
  return (
    <Resultado
      contexto={{ tipo: "categoria", categoria }}
      itensBase={noCaminho(catalogo.produtos, `/${categoria}`)}
      filtros={resultado.listagem.filtros}
      ordem={resultado.listagem.ordem ?? ORDEM_PADRAO}
      pagina={resultado.listagem.pagina ?? 1}
      // Categorias principais com bloco editorial configurado (edicoes.ts), depois de 2 linhas de cards.
      blocos={blocosDaCategoria(categoria)}
      primeiraLinhaBlocos={LINHA_BLOCOS_CATEGORIA}
    />
  );
}
