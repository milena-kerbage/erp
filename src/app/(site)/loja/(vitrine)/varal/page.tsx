import type { Metadata } from "next";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { margens, prosa } from "@/loja/componentes/institucional/estilos";
import { Varal } from "@/loja/componentes/varal/Varal";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/varal";

export const metadata: Metadata = metadataPagina({
  titulo: "Varal de roupinhas: ganhe um mimo para o enxoval",
  descricao: "Escolha uma roupinha do varal do Ateliê Milena Kerbage e descubra o seu cupom de desconto para o enxoval do bebê. Uma escolha por cliente.",
  caminho: CAMINHO,
  indexar: true,
});

// Varal de roupinhas (módulo Marketing do ERP): o minigame de um clique que entrega um cupom. O jogo é o
// componente <Varal>; aqui ficam a moldura da página e o "como funciona". As regras (prêmios, validade e valor
// mínimo) são cadastradas no ERP e o sorteio acontece no servidor.
export default function PaginaVaral() {
  return (
    <div className={cx(margens, css({ pt: { base: "4", md: "8" }, pb: { base: "14", desktop: "20" } }))}>
      <Varal />
      <div className={cx(prosa, css({ mt: { base: "12", desktop: "16" }, mx: "auto" }))}>
        <h2 id="como-funciona">Como funciona</h2>
        <ol>
          <li>Você informa o seu WhatsApp e escolhe uma roupinha do varal.</li>
          <li>A peça cai e a etiqueta mostra o seu desconto, com o código do cupom.</li>
          <li>O cupom já fica aplicado na sua sacola. É só montar o enxoval e enviar o pedido pelo WhatsApp.</li>
        </ol>
        <p>
          É uma escolha por cliente, e todas as roupinhas têm as mesmas chances: a peça é só a graça do jogo. Um cupom por pedido, sem somar com
          outros. Dúvidas? Veja as <Link href="/ajuda/perguntas-frequentes">perguntas frequentes</Link>.
        </p>
      </div>
    </div>
  );
}
