import type { Metadata } from "next";
import { SugestoesProjetos } from "@/loja/componentes/casas/comuns";
import type { ResumoProjeto } from "@/loja/componentes/casas/FormularioPedido";
import { SelecaoProjetos } from "@/loja/componentes/casas/SelecaoProjetos";
import { listarProjetos, projetosEmDestaque, resumoProjeto } from "@/loja/lib/casas/catalogo";
import { EMPRESA } from "@/loja/lib/empresa";

// Seleção de projetos: os projetos escolhidos com o pacote de cada um, guardados no navegador e
// separados do carrinho de produtos. A finalização é o formulário de orçamento, que abre o WhatsApp
// do ateliê com todos os projetos juntos. Página de sessão: fora do índice (seo.md).
export const metadata: Metadata = {
  title: "Sua seleção de projetos",
  robots: { index: false, follow: false },
  alternates: { canonical: "/projetos/selecao" },
};

export default function PaginaSelecaoProjetos() {
  const projetos: ResumoProjeto[] = listarProjetos().map((projeto) => ({
    slug: projeto.slug,
    nome: projeto.nome,
    tema: projeto.tema,
    resumo: resumoProjeto(projeto),
    precoAPartirDe: projeto.precoAPartirDe,
    paleta: projeto.paleta,
  }));
  const sugestoes = (
    <SugestoesProjetos id="titulo-sugestoes-selecao" titulo="Você também poderá gostar" projetos={projetosEmDestaque()} recuo={false} />
  );
  return <SelecaoProjetos projetos={projetos} numero={EMPRESA.whatsapp.numero} sugestoes={sugestoes} />;
}
