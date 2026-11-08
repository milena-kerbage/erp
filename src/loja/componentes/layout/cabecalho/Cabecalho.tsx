import Link from "next/link";
import { css } from "styled-system/css";
import { BarraCabecalho } from "./BarraCabecalho";
import { FaixaPromo } from "./FaixaPromo";
import { LINKS_GAVETA, LINKS_SERVICO, montarMenu } from "./menu";
import { LINKS_UTILITARIOS, TERMOS_MAIS_BUSCADOS } from "./navegacao";

// Cabeçalho da loja no modelo da shop.lululemon.com (lululemon-referencia.md §1 e §2): link para
// pular ao conteúdo, faixa promocional que rola com a página e a barra (pílula flutuante no desktop,
// barra branca que some ao descer no celular). Os itens do menu saem do servidor (motor de URLs);
// só as partes interativas são Client Components.
// Fora da home, o <main> reserva o topo com `reservaDoCabecalho` (estilos.ts).
export function Cabecalho() {
  return (
    <>
      <a href="#conteudo" className={pularConteudo}>
        Pular para o conteúdo
      </a>
      <FaixaPromo>
        Entrega para todo o Brasil. Peças a pronta entrega saem do ateliê em até 2 dias úteis.{" "}
        <Link href={LINKS_UTILITARIOS.loja.href}>Ver pronta entrega</Link>
      </FaixaPromo>
      <BarraCabecalho menu={montarMenu()} termos={TERMOS_MAIS_BUSCADOS} servico={LINKS_SERVICO} linksGaveta={LINKS_GAVETA} />
    </>
  );
}

// Skip link (§1.7): 1×1 e transparente até receber foco; então 12×16 de respiro, fundo claro, 14/500.
const pularConteudo = css({
  position: "absolute",
  top: "0",
  left: "5",
  zIndex: "pularConteudo",
  w: "[1px]",
  h: "[1px]",
  overflow: "hidden",
  opacity: "0",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  bg: "superficie",
  _focus: { w: "auto", h: "auto", px: "4", py: "3", opacity: "1", boxShadow: "anelFoco", outline: "none" },
});
