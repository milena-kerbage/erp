import { css } from "styled-system/css";
import { CarrosselProdutos } from "@/loja/componentes/inicio/CarrosselProdutos";
import {
  CARROSSEL_MAIS_VENDIDOS,
  CARROSSEL_PRONTA_ENTREGA,
} from "@/loja/componentes/inicio/conteudo";
import { FeatureTelaCheia } from "@/loja/componentes/inicio/FeatureTelaCheia";
import { GradeAbas } from "@/loja/componentes/inicio/GradeAbas";
import { Hero } from "@/loja/componentes/inicio/Hero";
import { SecaoInstagram } from "@/loja/componentes/inicio/Instagram";
import { ParEditorial } from "@/loja/componentes/inicio/ParEditorial";
import { indiceDaLoja } from "@/lib/loja/catalogo";
import { PRONTA_ENTREGA } from "@/loja/lib/catalogo/constantes";
import { homeComFotos } from "@/loja/lib/catalogo/apresentacao";
import { produtosEmDestaque } from "@/loja/lib/catalogo/curadoria";

// Página inicial: alterna mídia de ponta a ponta com módulos contidos e claros, com 96 px entre
// módulos no desktop e 64 no celular, e fecha com o Instagram do ateliê antes do rodapé.
// Fotos: ver src/loja/componentes/inicio/conteudo.ts. Carrosséis: as coleções "mais-vendidos" e
// "pronta-entrega" do cadastro do ERP (sem a coleção, as peças a pronta entrega do catálogo).
export default async function PaginaInicial() {
  const { catalogo, buscarVarios, colecao } = await indiceDaLoja();
  const maisVendidos = buscarVarios(catalogo.maisVendidos);
  const home = homeComFotos(catalogo);
  const destaques = maisVendidos.length ? maisVendidos : produtosEmDestaque(catalogo);
  const colecaoPronta = catalogo.origem === "banco" ? colecao("pronta-entrega") : [];
  const prontaEntrega = (colecaoPronta.length ? colecaoPronta : catalogo.produtos.filter((produto) => produto.atributos.entrega?.includes(PRONTA_ENTREGA))).slice(0, 8);

  return (
    <>
      <h1 className={css({ srOnly: true })}>Ateliê Milena Kerbage: enxoval e quarto de bebê feitos à mão</h1>
      {/* 0 */}
      <Hero slides={home.slides} />
      {/* 2 */}
      <ParEditorial itens={home.editorial} />
      {/* 3 e 4 */}
      {home.novidades.abas.length > 0 && <GradeAbas grade={home.novidades} />}
      {home.porCor.abas.length > 0 && <GradeAbas grade={home.porCor} />}
      {/* 5 */}
      <FeatureTelaCheia feature={home.projetos} />
      {/* 6 */}
      {destaques.length > 0 && <CarrosselProdutos {...(maisVendidos.length ? CARROSSEL_MAIS_VENDIDOS : { id: "selecao-atelie", titulo: "Da nossa costura para o seu quartinho", acao: { rotulo: "Conhecer os kits", href: "/kit-berco/kits" } })} produtos={destaques} />}
      {/* 7 */}
      {home.quarto.abas.length > 0 && <GradeAbas grade={home.quarto} />}
      {/* 8 */}
      <FeatureTelaCheia feature={home.maternidade} />
      {/* 9 */}
      {prontaEntrega.length > 0 && <CarrosselProdutos {...CARROSSEL_PRONTA_ENTREGA} produtos={prontaEntrega} />}
      {/* 10 */}
      <FeatureTelaCheia feature={home.bordado} />
      {/* 11 */}
      {home.enxoval.abas.length > 0 && <GradeAbas grade={home.enxoval} />}
      {/* 12: posts reais do Instagram (ou o convite para seguir) */}
      <SecaoInstagram />
    </>
  );
}
