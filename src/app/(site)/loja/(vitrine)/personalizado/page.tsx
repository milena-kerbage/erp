import type { Metadata } from "next";
import { Suspense } from "react";
import { ATALHOS_PROJETOS } from "@/loja/componentes/casas/comuns";
import { ResultadoProjetos } from "@/loja/componentes/casas/ListagemProjetos";
import { ProjetosNaUrl } from "@/loja/componentes/casas/ProjetosNaUrl";
import { ConviteMontador, DiferenciaisProjetos } from "@/loja/componentes/casas/secoes";
import { CabecalhoListagem } from "@/loja/componentes/listagem/CabecalhoListagem";
import { ContinueExplorando } from "@/loja/componentes/listagem/ContinueExplorando";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { listarProjetos, PRAZO_PRODUCAO } from "@/loja/lib/casas/catalogo";
import { arvoreDaLoja } from "@/lib/loja/catalogo";
import { CATEGORIAS_EXISTENTES } from "@/loja/lib/catalogo/categorias";
import { schemaListagemProjetos, schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// Projetos (item "Projetos" do menu, como o SNKRS na Nike): quartos de bebê completos no mesmo padrão
// da listagem de produtos (Lululemon, referencia.md §13): topo com título, contagem e atalhos; grade
// de 2 px; visualização e filtros na barra flutuante do site; "Continue explorando" no fim. O topo é
// estático; só a grade filtrada fica no <Suspense>. O "Monte o seu quartinho" entra como 1º card da
// grade e no convite logo abaixo dela.

export const metadata: Metadata = {
  title: "Personalizado: quartinho de bebê completo",
  description: `Quartinhos de bebê completos do Ateliê Milena Kerbage: kit berço, cortina, tapete, almofadas e enfeite de porta no mesmo tema. Produção em ${PRAZO_PRODUCAO} e entrega para todo o Brasil.`,
  alternates: { canonical: "/personalizado" },
  // Fora do índice como o resto do catálogo de exemplo (preços fictícios), até o catálogo real entrar.
  robots: { index: false, follow: true },
};

// Estática na CDN: filtros e ordem da query (?tema=…) são aplicados no navegador (ProjetosNaUrl).
export default async function PaginaProjetos() {
  const { categoriasRelacionadas } = await arvoreDaLoja();
  const projetos = listarProjetos();
  return (
    <>
      <JsonLd dados={schemaListagemProjetos("Personalizado", "/personalizado", projetos)} />
      <JsonLd dados={schemaTrilhaProjetos([{ rotulo: "Personalizado", href: "/personalizado" }])} />
      <CabecalhoListagem trilha={[]} titulo="Personalizado" total={projetos.length} unidade={["quartinho", "quartinhos"]} atalhos={ATALHOS_PROJETOS} />
      <Suspense fallback={<ResultadoProjetos projetos={projetos} categoria="personalizado" filtrosDaUrl={{}} />}>
        <ProjetosNaUrl projetos={projetos} categoria="personalizado" existentes={[...CATEGORIAS_EXISTENTES]} />
      </Suspense>
      <ConviteMontador />
      <DiferenciaisProjetos />
      <ContinueExplorando base="Personalizado" categorias={categoriasRelacionadas(["personalizado"]).filter((elo) => !elo.href.startsWith("/personalizado"))} />
    </>
  );
}
