import type { Metadata } from "next";
import { Montador } from "@/loja/componentes/casas/Montador";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { MODULOS } from "@/loja/lib/casas/modulos";
import { buscarVarios, condicoesDePagamento } from "@/loja/lib/catalogo/exemplos";
import { fotoPrincipal } from "@/loja/lib/catalogo/fotos";
import { schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// "Monte o seu quartinho": o projeto personalizado, peça por peça (componentes/casas/Montador.tsx e
// regras em lib/casas/modulos.ts). Rota estática ao lado de /projetos/[slug] (a rota fixa vence o
// segmento dinâmico). Fora do índice como o resto do catálogo de exemplo (preços fictícios).
export const metadata: Metadata = {
  title: "Monte o seu quartinho: projeto de quarto de bebê personalizado",
  description:
    "Monte o quarto do bebê peça por peça com o Ateliê Milena Kerbage: tema, paleta, kit berço, cortina, tapete, almofadas, paninhos e bolsa maternidade, com o valor a partir de na hora.",
  alternates: { canonical: "/projetos/monte-o-seu" },
  robots: { index: false, follow: true },
};

export default function PaginaMonteOSeu() {
  // Confirmação "Adicionado ao seu enxoval": peças avulsas do catálogo que completam o quarto.
  const sugestoes = buscarVarios(MODULOS.flatMap((modulo) => modulo.produto ?? []))
    .slice(0, 8)
    .map((produto) => ({
      slug: produto.slug,
      nome: produto.nome,
      pix: condicoesDePagamento(produto.preco)?.pix ?? produto.preco,
      precisaEscolher: Boolean(produto.variacao),
      foto: fotoPrincipal(produto),
    }));
  return (
    <>
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Projetos", href: "/projetos" },
          { rotulo: "Monte o seu quartinho", href: "/projetos/monte-o-seu" },
        ])}
      />
      <Montador sugestoes={sugestoes} />
    </>
  );
}
