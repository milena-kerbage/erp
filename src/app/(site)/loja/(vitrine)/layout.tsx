import { css, cx } from "styled-system/css";
import { Cabecalho } from "@/loja/componentes/layout/cabecalho/Cabecalho";
import { reservaDoCabecalho } from "@/loja/componentes/layout/cabecalho/estilos";
import { TransicaoPagina } from "@/loja/componentes/layout/TransicaoPagina";
import { Rodape } from "@/loja/componentes/layout/rodape/Rodape";

// Grupo (loja): páginas públicas com cabeçalho e rodapé. Checkout e conta terão layout próprio
// (sem distrações e com CSP por nonce, seguranca.md §5.1).
export default function LayoutLoja({ children }: LayoutProps<"/loja">) {
  return (
    <div className={css({ minH: "dvh", display: "flex", flexDirection: "column" })}>
      <Cabecalho />
      <main id="conteudo" className={cx(css({ flex: "1" }), reservaDoCabecalho)}>
        <TransicaoPagina>{children}</TransicaoPagina>
      </main>
      <Rodape />
    </div>
  );
}
