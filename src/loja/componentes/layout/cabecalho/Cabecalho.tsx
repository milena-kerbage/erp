import { css } from "styled-system/css";
import { BarraCabecalho } from "./BarraCabecalho";
import { menuDaLoja } from "@/lib/loja/catalogo";
import { LINKS_GAVETA, LINKS_SERVICO } from "./menu";
import { TERMOS_MAIS_BUSCADOS } from "./navegacao";

// Cabeçalho da loja: link para pular ao conteúdo e a barra (pílula flutuante no desktop, barra clara
// que some ao descer no celular). Sem faixa promocional acima: a pílula é a primeira coisa da página.
// Os itens do menu saem do servidor (cadastro do ERP, ou o menu estático de menu.ts no fallback); só as
// partes interativas são Client Components.
// Fora da home, o <main> reserva o topo com `reservaDoCabecalho` (estilos.ts).
export async function Cabecalho() {
  return (
    <>
      <a href="#conteudo" className={pularConteudo}>
        Pular para o conteúdo
      </a>
      <BarraCabecalho menu={await menuDaLoja()} termos={TERMOS_MAIS_BUSCADOS} servico={LINKS_SERVICO} linksGaveta={LINKS_GAVETA} />
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
