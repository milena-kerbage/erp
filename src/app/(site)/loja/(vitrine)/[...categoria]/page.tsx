import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { ResultadoNaUrl } from "@/loja/componentes/listagem/ResultadoNaUrl";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { blocosDaCategoria, LINHA_BLOCOS_CATEGORIA } from "@/loja/lib/catalogo/edicoes";
import { filtrar, noCaminho, paraListagem } from "@/loja/lib/catalogo/listagem";
import { comVersao, compartilhamento, robotsDoCatalogo, SITE } from "@/loja/lib/seo/compartilhar";
import { REGRAS_SEO } from "@/loja/lib/seo/config";
import { interpretarUrlListagem, ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Listagem por categoria no modelo da Lululemon (shop.lululemon.com/c/women-puffer-jackets, nov/2026).
// URL, facetas indexáveis no caminho, canonical e 404 vêm do motor (src/lib/seo/urls.ts); a forma
// canônica é imposta com 308 no proxy. A página inteira é estática por caminho (pré-gerada e servida
// pela CDN, sem função a cada visita): filtros, ordem e página da query (?cor=…) são aplicados no
// navegador (ResultadoNaUrl). Atualiza quando o ERP muda o catálogo (revalidateTag) ou a cada hora.

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
  const descricao = `${dados.titulo} do Ateliê Milena Kerbage, em Fortaleza: ${dados.total} ${dados.total === 1 ? "peça" : "peças"} de enxoval em percal 230 fios ou 400 fios egípcios. Tudo pode ser personalizado, com entrega para todo o Brasil.`;
  const { origem, versao } = await catalogoDaLoja();
  return {
    title: dados.titulo,
    description: descricao,
    alternates: { canonical: dados.canonical },
    ...compartilhamento({ titulo: `${dados.titulo} | ${SITE}`, descricao, caminho: dados.canonical, imagem: comVersao(`/og/categoria${dados.canonical}`, versao), alt: `${dados.titulo} do Ateliê Milena Kerbage` }),
    // Catálogo real (cadastro do ERP) indexado; o de exemplo (preços fictícios), nunca. Listagem vazia fica de fora.
    robots: dados.total > 0 ? robotsDoCatalogo(origem) : { index: false, follow: true },
  };
}

export const revalidate = 3600;

// Categoria inexistente vira 404 antes de qualquer streaming.
export default async function PaginaCategoria({ params }: Props) {
  const segmentos = (await params).categoria;
  const dados = await resolver(segmentos);
  if (!dados) notFound();
  const [arvore, catalogo] = await Promise.all([arvoreDaLoja(), catalogoDaLoja()]);
  const caminho = `/${segmentos.join("/")}`;
  const semQuery = interpretarUrlListagem(caminho, new URLSearchParams(), arvore.existentes, REGRAS_SEO);
  if (semQuery.tipo !== "ok") notFound();
  const categoria = semQuery.listagem.categoria;
  const itensBase = noCaminho(catalogo.produtos, `/${categoria}`).map(paraListagem);
  // Categorias principais com bloco editorial configurado (edicoes.ts), depois de 2 linhas de cards.
  const blocos = blocosDaCategoria(categoria);
  return (
    <>
      <CabecalhoListagem trilha={dados.trilha} titulo={dados.titulo} total={dados.total} atalhos={dados.atalhos} />
      {/* Fallback = a 1ª página sem filtros da query, já no HTML estático (Google e sem JavaScript). */}
      <Suspense
        fallback={
          <Resultado contexto={{ tipo: "categoria", categoria }} itensBase={itensBase} filtros={semQuery.listagem.filtros} ordem={ORDEM_PADRAO} pagina={1} blocos={blocos} primeiraLinhaBlocos={LINHA_BLOCOS_CATEGORIA} />
        }
      >
        <ResultadoNaUrl caminho={caminho} existentes={[...arvore.existentes]} itensBase={itensBase} blocos={blocos} primeiraLinhaBlocos={LINHA_BLOCOS_CATEGORIA} />
      </Suspense>
      <ContinueExplorando base={dados.titulo} categorias={dados.relacionadas} />
    </>
  );
}
