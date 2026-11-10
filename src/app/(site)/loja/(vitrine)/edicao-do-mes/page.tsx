import type { Metadata } from "next";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { ResultadoDaQuery } from "@/loja/componentes/listagem/ResultadoDaQuery";
import { arvoreDaLoja, indiceDaLoja } from "@/lib/loja/catalogo";
import { EDICAO_ATUAL, ROTA_EDICAO } from "@/loja/lib/catalogo/edicoes";
import { paraListagem } from "@/loja/lib/catalogo/listagem";
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

// Estática na CDN: filtros, ordem e página da query aplicados no navegador (ResultadoDaQuery).
export const revalidate = 3600;

export default async function PaginaEdicaoDoMes() {
  const [{ pecas, edicao }, { categoriasRelacionadas }] = await Promise.all([pecasDaEdicao(), arvoreDaLoja()]);
  const itens = pecas.map(paraListagem);
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
      <Suspense fallback={<Resultado contexto={{ tipo: "categoria", categoria: CHAVE }} itensBase={itens} filtros={{}} ordem={ORDEM_PADRAO} pagina={1} blocos={edicao.blocos} primeiraLinhaBlocos={edicao.primeiraLinha ?? 0} />}>
        <ResultadoDaQuery categoria={CHAVE} itensBase={itens} blocos={edicao.blocos} primeiraLinhaBlocos={edicao.primeiraLinha ?? 0} />
      </Suspense>
      <ContinueExplorando base="a edição do mês" categorias={categoriasRelacionadas(categorias)} />
    </>
  );
}
