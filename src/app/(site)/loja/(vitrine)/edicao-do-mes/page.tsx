import type { Metadata } from "next";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { arvoreDaLoja, indiceDaLoja } from "@/lib/loja/catalogo";
import { EDICAO_ATUAL, ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { filtrosDaQuery } from "@/loja/lib/catalogo/urlsListagem";
import { ORDEM_PADRAO } from "@/loja/lib/seo/urls";
import { edicaoComFotos } from "@/loja/lib/catalogo/apresentacao";

// Edição do mês (a "Monthly Edit" da shop.lululemon.com, lululemon-animacoes-edicao.md §3): a mesma
// listagem das categorias (topo, pílula "Ver" e filtros) com blocos editoriais grandes intercalados
// na grade. O conteúdo (título, atalhos, produtos e blocos) vem de src/loja/lib/catalogo/edicoes.ts;
// trocar de edição é editar só aquele arquivo. Os filtros vão na query (/edicao-do-mes?cor=rose),
// montados pelo motor de URLs com "edicao-do-mes" no lugar da categoria, como a pronta entrega.

const CHAVE = ROTA_EDICAO.slice(1);

async function pecasDaEdicao() {
  const indice = await indiceDaLoja();
  const edicao = edicaoComFotos(indice.catalogo);
  return { pecas: indice.buscarVarios(edicao.produtos), edicao };
}

export const metadata: Metadata = {
  title: `Edição do mês: ${EDICAO_ATUAL.titulo}`,
  description: "A seleção do ateliê para os primeiros dias: kits de berço, tecidos e bordados para receber o bebê.",
  alternates: { canonical: ROTA_EDICAO },
  // Catálogo de exemplo (preços fictícios): fora do índice até a API de catálogo existir.
  robots: { index: false, follow: true },
};

export default async function PaginaEdicaoDoMes({ searchParams }: PageProps<"/loja/edicao-do-mes">) {
  const [{ pecas, edicao }, { categoriasRelacionadas }] = await Promise.all([pecasDaEdicao(), arvoreDaLoja()]);
  const categorias = [...new Set(pecas.map((peca) => peca.caminho.split("/")[1]))].filter(Boolean);
  return (
    <>
      <CabecalhoListagem
        trilha={[
          // "Novidades" = a própria edição ordenada por novidades (não há página geral de lançamentos).
          { rotulo: "Novidades", href: `${ROTA_EDICAO}?ordem=lancamentos` },
          { rotulo: "Edição do mês", href: ROTA_EDICAO },
        ]}
        titulo={EDICAO_ATUAL.titulo}
        total={pecas.length}
        atalhos={edicao.atalhos}
      />
      <Suspense fallback={<EsqueletoGrade />}>
        <Grade searchParams={searchParams} />
      </Suspense>
      <ContinueExplorando base="a edição do mês" categorias={categoriasRelacionadas(categorias)} />
    </>
  );
}

async function Grade({ searchParams }: Pick<PageProps<"/loja/edicao-do-mes">, "searchParams">) {
  const { pecas, edicao } = await pecasDaEdicao();
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(valor) ? valor : [valor ?? ""]) busca.append(chave, item);
  }
  return (
    <Resultado
      contexto={{ tipo: "categoria", categoria: CHAVE }}
      itensBase={pecas}
      filtros={filtrosDaQuery(busca)}
      ordem={busca.get("ordem") ?? ORDEM_PADRAO}
      pagina={Math.max(1, Math.min(500, Number(busca.get("pagina")) || 1))}
      blocos={edicao.blocos}
      primeiraLinhaBlocos={edicao.primeiraLinha ?? 0}
    />
  );
}
