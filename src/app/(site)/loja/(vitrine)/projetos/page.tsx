import type { Metadata } from "next";
import { Suspense } from "react";
import { ATALHOS_PROJETOS } from "@/loja/componentes/casas/comuns";
import { ListagemProjetos } from "@/loja/componentes/casas/ListagemProjetos";
import { ConviteMontador, DiferenciaisProjetos } from "@/loja/componentes/casas/secoes";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { EsqueletoGrade } from "@/loja/componentes/listagem/Esqueleto";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { listarProjetos, PRAZO_PRODUCAO } from "@/loja/lib/casas/catalogo";
import { categoriasRelacionadas } from "@/loja/lib/catalogo/categorias";
import { schemaListagemProjetos, schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// Projetos (item "Projetos" do menu, como o SNKRS na Nike): quartos de bebê completos no mesmo padrão
// da listagem de produtos (Lululemon, referencia.md §13): topo com título, contagem e atalhos; grade
// de 2 px; visualização e filtros na barra flutuante do site; "Continue explorando" no fim. O topo é
// estático; só a grade filtrada fica no <Suspense>. O "Monte o seu quartinho" entra como 1º card da
// grade e no convite logo abaixo dela.

export const metadata: Metadata = {
  title: "Projetos: quarto de bebê completo",
  description: `Projetos de quarto de bebê completos do Ateliê Milena Kerbage: kit berço, cortina, tapete, almofadas e enfeite de porta no mesmo tema. Produção em ${PRAZO_PRODUCAO} e entrega para todo o Brasil.`,
  alternates: { canonical: "/projetos" },
  // Fora do índice como o resto do catálogo de exemplo (preços fictícios), até o catálogo real entrar.
  robots: { index: false, follow: true },
};

export default function PaginaProjetos({ searchParams }: PageProps<"/loja/projetos">) {
  const projetos = listarProjetos();
  return (
    <>
      <JsonLd dados={schemaListagemProjetos("Projetos", "/projetos", projetos)} />
      <JsonLd dados={schemaTrilhaProjetos([{ rotulo: "Projetos", href: "/projetos" }])} />
      <CabecalhoListagem trilha={[]} titulo="Projetos" total={projetos.length} unidade={["projeto", "projetos"]} atalhos={ATALHOS_PROJETOS} />
      <Suspense fallback={<EsqueletoGrade />}>
        <ListagemProjetos projetos={projetos} categoria="projetos" searchParams={searchParams} />
      </Suspense>
      <ConviteMontador />
      <DiferenciaisProjetos />
      <ContinueExplorando base="Projetos" categorias={categoriasRelacionadas(["projetos"]).filter((elo) => !elo.href.startsWith("/projetos"))} />
    </>
  );
}
