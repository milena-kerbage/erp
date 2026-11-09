import { css } from "styled-system/css";
import { CarrosselProdutos } from "@/loja/componentes/inicio/CarrosselProdutos";
import {
  CARROSSEL_MAIS_VENDIDOS,
  CARROSSEL_PRONTA_ENTREGA,
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
import { FeatureTelaCheia } from "@/loja/componentes/inicio/FeatureTelaCheia";
import { GradeAbas } from "@/loja/componentes/inicio/GradeAbas";
import { Hero } from "@/loja/componentes/inicio/Hero";
import { SecaoInstagram } from "@/loja/componentes/inicio/Instagram";
import { ParEditorial } from "@/loja/componentes/inicio/ParEditorial";
import { indiceDaLoja } from "@/lib/loja/catalogo";
import { PRONTA_ENTREGA } from "@/loja/lib/catalogo/constantes";

// Página inicial: alterna mídia de ponta a ponta com módulos contidos e claros, com 96 px entre
// módulos no desktop e 64 no celular, e fecha com o Instagram do ateliê antes do rodapé.
// Fotos: ver src/loja/componentes/inicio/conteudo.ts. Carrosséis: as coleções "mais-vendidos" e
// "pronta-entrega" do cadastro do ERP (sem a coleção, as peças a pronta entrega do catálogo).
export default async function PaginaInicial() {
  const { catalogo, buscarVarios, colecao } = await indiceDaLoja();
  const maisVendidos = buscarVarios(catalogo.maisVendidos);
  const colecaoPronta = catalogo.origem === "banco" ? colecao("pronta-entrega") : [];
  const prontaEntrega = (colecaoPronta.length ? colecaoPronta : catalogo.produtos.filter((produto) => produto.atributos.entrega?.includes(PRONTA_ENTREGA))).slice(0, 8);

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
      {/* 12: posts reais do Instagram (ou o convite para seguir) */}
      <SecaoInstagram />
    </>
  );
}
