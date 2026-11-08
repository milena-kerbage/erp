import type { Icon } from "@phosphor-icons/react";
import { css } from "styled-system/css";
import { Armchair, Baby, Cloud, Flower, Heart, PawPrint } from "@/loja/componentes/icones";
import type { Projeto } from "@/loja/lib/casas/catalogo";
import type { Elo } from "@/loja/lib/catalogo/categorias";
import { CardProjetoVitrine } from "./CardProjeto";

// Peças comuns da área Projetos.

// Atalhos do topo da listagem (a fileira de subcoleções da Lululemon em CabecalhoListagem): enquanto
// não há fotos, vão como ícone e texto. Os mesmos caminhos do menu "Projetos" (navegacao.ts).
export const ATALHOS_PROJETOS: Array<Elo & { icone: Icon }> = [
  { rotulo: "Para menina", href: "/projetos/menina", icone: Heart },
  { rotulo: "Para menino", href: "/projetos/menino", icone: Baby },
  { rotulo: "Floral", href: "/projetos/floral", icone: Flower },
  { rotulo: "Safári", href: "/projetos/safari", icone: PawPrint },
  { rotulo: "Nuvens e céu", href: "/projetos/nuvens", icone: Cloud },
  { rotulo: "Clássico", href: "/projetos/classico", icone: Armchair },
];

// Atalhos para as páginas de seleção: os de cima mais "Neutros" (que não cabe na fileira de 6 da raiz).
export const ATALHOS_SELECOES: Array<Elo & { icone: Icon }> = [
  ...ATALHOS_PROJETOS.slice(0, 2),
  { rotulo: "Neutros", href: "/projetos/neutro", icone: Cloud },
  ...ATALHOS_PROJETOS.slice(2),
];

// "Você também poderá gostar" no padrão das vitrines de produto (Vitrine.tsx, Adidas): título em
// caixa alta e grade de 4 com o card de projeto no formato do card de produto.
// recuo={false} quando a página já tem o respiro lateral (seleção de projetos), como em VitrineSugestoes.
export function SugestoesProjetos({
  id,
  titulo,
  projetos,
  recuo = true,
}: {
  id: string;
  titulo: string;
  projetos: Projeto[];
  recuo?: boolean;
}) {
  if (projetos.length === 0) return null;
  return (
    <section aria-labelledby={id} className={css({ mt: { base: "14", lg: "16" }, px: recuo ? { base: "4", lg: "8" } : "0" })}>
      <h2 id={id} className={tituloVitrine}>
        {titulo}
      </h2>
      <ul
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
          gap: "[2px]",
          mt: "6",
        })}
      >
        {projetos.map((projeto, indice) => (
          <li key={projeto.slug}>
            <CardProjetoVitrine projeto={projeto} tom={indice} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Título das vitrines da Adidas (caixa alta, condensado, pesado), como em Vitrine.tsx.
const tituloVitrine = css({
  fontFamily: "titulo",
  fontSize: { base: "2xl", lg: "3xl" },
  fontWeight: "extrabold",
  letterSpacing: "tight",
  textTransform: "uppercase",
  color: "escuro",
});
