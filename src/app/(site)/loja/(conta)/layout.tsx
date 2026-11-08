import { css, cx } from "styled-system/css";
import { Cabecalho } from "@/loja/componentes/layout/cabecalho/Cabecalho";
import { reservaDoCabecalho } from "@/loja/componentes/layout/cabecalho/estilos";
import { TransicaoPagina } from "@/loja/componentes/layout/TransicaoPagina";
import { Rodape } from "@/loja/componentes/layout/rodape/Rodape";

// Grupo (conta): área do cliente com o cabeçalho e o rodapé da loja. [A FAZER] com login:
// páginas dinâmicas, no-store e protegidas pela API (seguranca.md).
export default function LayoutConta({ children }: LayoutProps<"/loja">) {
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
