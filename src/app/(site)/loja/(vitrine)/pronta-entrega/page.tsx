import type { Metadata } from "next";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { filtrar, slugificar } from "@/loja/lib/catalogo/listagem";
import { filtrosDaQuery } from "@/loja/lib/catalogo/urlsListagem";
import { ORDEM_PADRAO } from "@/loja/lib/seo/urls";

// Pronta entrega (destaque do Instagram do ateliê): todas as peças com entrega=pronta-entrega, que
// saem do ateliê em até 2 dias úteis. Mesma listagem das categorias; os demais filtros vão na query
// (/pronta-entrega?cor=rose), montados pelo motor de URLs com "pronta-entrega" no lugar da categoria.

const CHAVE = "pronta-entrega";
const TITULO = "Pronta entrega";

async function pecasProntas() {
  return filtrar((await catalogoDaLoja()).produtos, { entrega: [slugificar(TITULO)] });
}

export const metadata: Metadata = {
  title: TITULO,
  description: "Kit berço, paninhos, mantas e saídas de maternidade do Ateliê Milena Kerbage que saem em até 2 dias úteis.",
  alternates: { canonical: `/${CHAVE}` },
  // Catálogo de exemplo (preços fictícios): fora do índice até a API de catálogo existir.
  robots: { index: false, follow: true },
};

export default async function PaginaProntaEntrega({ searchParams }: PageProps<"/loja/pronta-entrega">) {
  const [pecas, { categoriasRelacionadas }] = await Promise.all([pecasProntas(), arvoreDaLoja()]);
  const categorias = [...new Set(pecas.map((peca) => peca.caminho.split("/")[1]))].filter(Boolean);
  return (
    <>
      <CabecalhoListagem
        trilha={[]}
        titulo={TITULO}
        total={pecas.length}
        unidade={["peça", "peças"]}
        atalhos={categoriasRelacionadas(categorias, 6)}
      />
      <Suspense fallback={<EsqueletoGrade />}>
        <Grade searchParams={searchParams} />
      </Suspense>
      <ContinueExplorando base="a pronta entrega" categorias={categoriasRelacionadas([])} />
    </>
  );
}

async function Grade({ searchParams }: Pick<PageProps<"/loja/pronta-entrega">, "searchParams">) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(valor) ? valor : [valor ?? ""]) busca.append(chave, item);
  }
  const { entrega: _fixo, ...filtros } = filtrosDaQuery(busca);
  return (
    <Resultado
      contexto={{ tipo: "categoria", categoria: CHAVE }}
      itensBase={await pecasProntas()}
      filtros={filtros}
      ordem={busca.get("ordem") ?? ORDEM_PADRAO}
      pagina={Math.max(1, Math.min(500, Number(busca.get("pagina")) || 1))}
    />
  );
}
