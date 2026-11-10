import type { Metadata } from "next";
import { Suspense } from "react";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { Resultado } from "@/loja/componentes/listagem/Resultado";
import { ResultadoDaQuery } from "@/loja/componentes/listagem/ResultadoDaQuery";
import { arvoreDaLoja, catalogoDaLoja } from "@/lib/loja/catalogo";
import { filtrar, paraListagem, slugificar } from "@/loja/lib/catalogo/listagem";
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

// Estática na CDN: filtros, ordem e página da query aplicados no navegador (ResultadoDaQuery).
export const revalidate = 3600;

export default async function PaginaProntaEntrega() {
  const [pecas, { categoriasRelacionadas }] = await Promise.all([pecasProntas(), arvoreDaLoja()]);
  const itens = pecas.map(paraListagem);
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
      <Suspense fallback={<Resultado contexto={{ tipo: "categoria", categoria: CHAVE }} itensBase={itens} filtros={{}} ordem={ORDEM_PADRAO} pagina={1} />}>
        <ResultadoDaQuery categoria={CHAVE} itensBase={itens} ignorar={["entrega"]} />
      </Suspense>
      <ContinueExplorando base="a pronta entrega" categorias={categoriasRelacionadas([])} />
    </>
  );
}

