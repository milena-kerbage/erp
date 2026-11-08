import { css } from "styled-system/css";
import { Atendimento } from "@/loja/componentes/inicio/Atendimento";
import { CarrosselProdutos } from "@/loja/componentes/inicio/CarrosselProdutos";
import {
  CARROSSEL_MAIS_VENDIDOS,
  CARROSSEL_PRONTA_ENTREGA,
  DESTAQUES,
  ENXOVAL,
  FEATURE_BORDADO,
  FEATURE_MATERNIDADE,
  FEATURE_PROJETOS,
  NOVIDADES,
  PAR_EDITORIAL,
  POR_COR,
  QUARTO,
  SLIDES,
} from "@/loja/componentes/inicio/conteudo";
import { FaixaMarca } from "@/loja/componentes/inicio/FaixaMarca";
import { FeatureTelaCheia } from "@/loja/componentes/inicio/FeatureTelaCheia";
import { GradeAbas } from "@/loja/componentes/inicio/GradeAbas";
import { GrupoDestaques } from "@/loja/componentes/inicio/GrupoDestaques";
import { Hero } from "@/loja/componentes/inicio/Hero";
import { ParEditorial } from "@/loja/componentes/inicio/ParEditorial";
import { buscarVarios, listarProdutos, MAIS_VENDIDOS_SLUGS, PRONTA_ENTREGA } from "@/loja/lib/catalogo/exemplos";

// Página inicial no modelo da home da shop.lululemon.com (lululemon-referencia.md §3): alterna mídia
// de ponta a ponta com módulos contidos e claros ("respiro, impacto, respiro"), com 96 px entre
// módulos no desktop e 64 no celular. Fotos: ver src/loja/componentes/inicio/conteudo.ts.
export default function PaginaInicial() {
  const maisVendidos = buscarVarios(MAIS_VENDIDOS_SLUGS);
  const prontaEntrega = listarProdutos()
    .filter((produto) => produto.atributos.entrega?.includes(PRONTA_ENTREGA))
    .slice(0, 8);

  return (
    <>
      <h1 className={css({ srOnly: true })}>Ateliê Milena Kerbage: enxoval e quarto de bebê feitos à mão</h1>
      {/* 0 */}
      <Hero slides={SLIDES} />
      {/* 2 */}
      <ParEditorial itens={PAR_EDITORIAL} />
      {/* 3 e 4 */}
      <GradeAbas grade={NOVIDADES} />
      <GradeAbas grade={POR_COR} />
      {/* 5 */}
      <FeatureTelaCheia feature={FEATURE_PROJETOS} />
      {/* 6 */}
      <CarrosselProdutos {...CARROSSEL_MAIS_VENDIDOS} produtos={maisVendidos} />
      {/* 7 */}
      <GradeAbas grade={QUARTO} />
      {/* 8 */}
      <FeatureTelaCheia feature={FEATURE_MATERNIDADE} />
      {/* 9 */}
      <CarrosselProdutos {...CARROSSEL_PRONTA_ENTREGA} produtos={prontaEntrega} />
      {/* 10 */}
      <FeatureTelaCheia feature={FEATURE_BORDADO} />
      {/* 11 */}
      <GradeAbas grade={ENXOVAL} />
      {/* 12 */}
      <Atendimento />
      {/* 13 */}
      <GrupoDestaques itens={DESTAQUES} />
      {/* 14 e 15 */}
      <FaixaMarca />
    </>
  );
}
